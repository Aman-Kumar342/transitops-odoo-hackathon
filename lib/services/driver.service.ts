import type { Prisma, Driver } from "@prisma/client";
import { driverRepository } from "@/lib/repositories/driver.repository";
import { tripRepository } from "@/lib/repositories/trip.repository";
import {
  ConflictError,
  NotFoundError,
  BusinessRuleError,
} from "@/lib/http/errors";
import {
  DRIVER_STATUS,
  DRIVER_STATUS_LABELS,
  canManuallyTransition,
  isLicenseExpired,
  isDriverEligible,
  todayUtc,
  type DriverStatusValue,
} from "@/lib/domain/driver";
import type {
  CreateDriverInput,
  UpdateDriverInput,
  ListDriversQuery,
} from "@/lib/validation/driver";

/**
 * Driver business logic (problem.md §4.4, §5 R3/R14/R17, §7.2). Single source of truth
 * for driver rules; the DB enforces the same invariants as a backstop. (guidelines.md §8)
 */

export interface DriverDTO {
  id: number;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string; // YYYY-MM-DD
  contactNumber: string;
  safetyScore: number;
  status: DriverStatusValue;
  statusLabel: string;
  userId: number | null;
  licenseExpired: boolean;
  eligible: boolean;
  tripsCompleted: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toDTO(d: Driver, tripsCompleted = 0): DriverDTO {
  const status = d.status as DriverStatusValue;
  return {
    id: d.id,
    name: d.name,
    licenseNumber: d.licenseNumber,
    licenseCategory: d.licenseCategory,
    licenseExpiryDate: d.licenseExpiryDate.toISOString().slice(0, 10),
    contactNumber: d.contactNumber,
    safetyScore: d.safetyScore,
    status,
    statusLabel: DRIVER_STATUS_LABELS[status],
    userId: d.userId,
    tripsCompleted,
    licenseExpired: isLicenseExpired(d.licenseExpiryDate),
    eligible: isDriverEligible({
      status,
      licenseExpiryDate: d.licenseExpiryDate,
      deletedAt: d.deletedAt,
    }),
    deletedAt: d.deletedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** Parse a YYYY-MM-DD string to a Date at UTC midnight (matches @db.Date storage). */
function parseExpiry(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export const driverService = {
  async list(query: ListDriversQuery) {
    const where: Prisma.DriverWhereInput = {};
    if (!query.includeDeleted) where.deletedAt = null;
    if (query.status) where.status = query.status;
    if (query.licenseCategory) where.licenseCategory = query.licenseCategory;
    if (query.licenseNumber) {
      where.licenseNumber = query.licenseNumber.trim().toUpperCase();
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { licenseNumber: { contains: query.search, mode: "insensitive" } },
      ];
    }
    // Eligibility filter (R3): Available + not expired (+ not deleted, already applied).
    if (query.eligible === "true") {
      where.status = DRIVER_STATUS.AVAILABLE;
      where.licenseExpiryDate = { gte: todayUtc() };
      where.deletedAt = null;
    } else if (query.eligible === "false") {
      where.OR = [
        { status: { not: DRIVER_STATUS.AVAILABLE } },
        { licenseExpiryDate: { lt: todayUtc() } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    const [items, total, completedCounts] = await Promise.all([
      driverRepository.findMany({
        where,
        orderBy: { [query.sort]: query.order },
        skip,
        take: query.limit,
      }),
      driverRepository.count(where),
      tripRepository.groupCompletedCountByDriver(),
    ]);

    const countByDriver = new Map(completedCounts.map((c) => [c.driverId, c._count._all]));

    return {
      items: items.map((d) => toDTO(d, countByDriver.get(d.id) ?? 0)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  },

  async getById(id: number): Promise<DriverDTO> {
    const driver = await driverRepository.findById(id);
    if (!driver || driver.deletedAt) throw NotFoundError("Driver not found");
    return toDTO(driver);
  },

  /**
   * Drivers whose license is expiring within `days` (or already expired) - the in-app
   * expiring-license reminder (bonus, PDF §8). Ordered by soonest expiry first.
   */
  async listExpiring(days: number): Promise<DriverDTO[]> {
    const cutoff = new Date(todayUtc().getTime() + days * 24 * 60 * 60 * 1000);
    const items = await driverRepository.findMany({
      where: { deletedAt: null, licenseExpiryDate: { lte: cutoff } },
      orderBy: { licenseExpiryDate: "asc" },
      skip: 0,
      take: 500,
    });
    return items.map(toDTO);
  },

  /** Dispatch pool — eligible drivers only (R3): Available, not expired, not deleted. */
  async listAvailable(): Promise<DriverDTO[]> {
    const items = await driverRepository.findMany({
      where: {
        status: DRIVER_STATUS.AVAILABLE,
        deletedAt: null,
        licenseExpiryDate: { gte: todayUtc() },
      },
      orderBy: { name: "asc" },
      skip: 0,
      take: 500,
    });
    return items.map(toDTO);
  },

  async create(input: CreateDriverInput): Promise<DriverDTO> {
    const existing = await driverRepository.findByLicenseNumber(input.licenseNumber);
    if (existing) {
      throw ConflictError("A driver with this license number already exists", {
        licenseNumber: ["Already registered"],
      });
    }
    try {
      const created = await driverRepository.create({
        name: input.name,
        licenseNumber: input.licenseNumber,
        licenseCategory: input.licenseCategory,
        licenseExpiryDate: parseExpiry(input.licenseExpiryDate),
        contactNumber: input.contactNumber,
        safetyScore: input.safetyScore,
      });
      return toDTO(created);
    } catch (err) {
      throw mapUniqueViolation(err);
    }
  },

  async update(id: number, input: UpdateDriverInput): Promise<DriverDTO> {
    const existing = await driverRepository.findById(id);
    if (!existing || existing.deletedAt) throw NotFoundError("Driver not found");

    if (input.licenseNumber && input.licenseNumber !== existing.licenseNumber) {
      const clash = await driverRepository.findByLicenseNumber(input.licenseNumber);
      if (clash && clash.id !== id) {
        throw ConflictError("A driver with this license number already exists", {
          licenseNumber: ["Already registered"],
        });
      }
    }

    const data: Prisma.DriverUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.licenseNumber !== undefined) data.licenseNumber = input.licenseNumber;
    if (input.licenseCategory !== undefined) data.licenseCategory = input.licenseCategory;
    if (input.licenseExpiryDate !== undefined)
      data.licenseExpiryDate = parseExpiry(input.licenseExpiryDate);
    if (input.contactNumber !== undefined) data.contactNumber = input.contactNumber;
    if (input.safetyScore !== undefined) data.safetyScore = input.safetyScore;

    try {
      const updated = await driverRepository.update(id, data);
      return toDTO(updated);
    } catch (err) {
      throw mapUniqueViolation(err);
    }
  },

  /** Soft delete / deactivate (§18-I). Cannot deactivate a driver that is On Trip. */
  async softDelete(id: number): Promise<void> {
    const existing = await driverRepository.findById(id);
    if (!existing || existing.deletedAt) throw NotFoundError("Driver not found");
    if (existing.status === DRIVER_STATUS.ON_TRIP) {
      throw BusinessRuleError(
        "Cannot deactivate a driver who is On Trip — complete or cancel the trip first",
      );
    }
    await driverRepository.update(id, { deletedAt: new Date() });
  },

  suspend(id: number) {
    return transitionTo(id, DRIVER_STATUS.SUSPENDED);
  },

  async reinstate(id: number): Promise<DriverDTO> {
    const existing = await driverRepository.findById(id);
    if (!existing || existing.deletedAt) throw NotFoundError("Driver not found");
    if (existing.status !== DRIVER_STATUS.SUSPENDED) {
      throw BusinessRuleError("Only a suspended driver can be reinstated");
    }
    const updated = await driverRepository.update(id, {
      status: DRIVER_STATUS.AVAILABLE,
    });
    return toDTO(updated);
  },

  /** Clock in (→Available) / clock out (→Off Duty). */
  setDuty(id: number, onDuty: boolean) {
    return transitionTo(
      id,
      onDuty ? DRIVER_STATUS.AVAILABLE : DRIVER_STATUS.OFF_DUTY,
    );
  },
};

/** Applies a validated manual status transition (§7.2). */
async function transitionTo(
  id: number,
  target: DriverStatusValue,
): Promise<DriverDTO> {
  const existing = await driverRepository.findById(id);
  if (!existing || existing.deletedAt) throw NotFoundError("Driver not found");

  const from = existing.status as DriverStatusValue;
  if (from === target) {
    throw BusinessRuleError(`Driver is already ${DRIVER_STATUS_LABELS[target]}`);
  }
  if (from === DRIVER_STATUS.ON_TRIP) {
    throw BusinessRuleError(
      "This driver is On Trip — complete or cancel the trip first",
    );
  }
  if (!canManuallyTransition(from, target)) {
    throw BusinessRuleError(
      `Cannot change status from ${DRIVER_STATUS_LABELS[from]} to ${DRIVER_STATUS_LABELS[target]}`,
    );
  }

  const updated = await driverRepository.update(id, { status: target });
  return toDTO(updated);
}

function mapUniqueViolation(err: unknown): unknown {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  ) {
    return ConflictError("A driver with this license number already exists", {
      licenseNumber: ["Already registered"],
    });
  }
  return err;
}
