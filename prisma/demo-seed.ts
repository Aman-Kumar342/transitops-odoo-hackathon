import { PrismaClient } from "@prisma/client";

/**
 * Demo dataset for presentations. Resets ONLY the TransitOps operational tables
 * (vehicles, drivers, trips, maintenance, fuel, expenses) and repopulates a coherent,
 * consistent fleet story. Roles and users are left untouched.
 *
 * Run: `npm run seed:demo` (destructive to operational data in the transitops DB only).
 *
 * All statuses here are set to a mutually-consistent state (e.g. a Dispatched trip's
 * vehicle + driver are On Trip; an open maintenance vehicle is In Shop), mirroring what
 * the transactional services would produce.
 */
const prisma = new PrismaClient();

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main() {
  // 1. Reset operational tables in FK-safe order (children first).
  await prisma.expense.deleteMany();
  await prisma.fuelLog.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  console.log("✔ Cleared operational tables");

  // 2. Vehicles (Fleet)
  const van05 = await prisma.vehicle.create({ data: { registrationNumber: "GJ01AB4521", nameModel: "VAN-05", type: "Van", maxLoadCapacity: 500, odometer: 74450, acquisitionCost: 620000, status: "AVAILABLE", region: "West" } });
  const truck11 = await prisma.vehicle.create({ data: { registrationNumber: "GJ01AB9981", nameModel: "TRUCK-11", type: "Truck", maxLoadCapacity: 5000, odometer: 182120, acquisitionCost: 2450000, status: "ON_TRIP", region: "North" } });
  const mini03 = await prisma.vehicle.create({ data: { registrationNumber: "GJ01AB1120", nameModel: "MINI-03", type: "Car", maxLoadCapacity: 1000, odometer: 66000, acquisitionCost: 410000, status: "IN_SHOP", region: "West" } });
  const van09 = await prisma.vehicle.create({ data: { registrationNumber: "GJ01AB0087", nameModel: "VAN-09", type: "Van", maxLoadCapacity: 750, odometer: 241900, acquisitionCost: 590000, status: "RETIRED", region: "East", retiredAt: date("2026-05-10") } });
  const truck04 = await prisma.vehicle.create({ data: { registrationNumber: "GJ01AB3390", nameModel: "TRUCK-04", type: "Truck", maxLoadCapacity: 4000, odometer: 95000, acquisitionCost: 2100000, status: "AVAILABLE", region: "North" } });
  const mini08 = await prisma.vehicle.create({ data: { registrationNumber: "GJ01AB7742", nameModel: "MINI-08", type: "Car", maxLoadCapacity: 900, odometer: 33000, acquisitionCost: 380000, status: "AVAILABLE", region: "West" } });
  const trk12 = await prisma.vehicle.create({ data: { registrationNumber: "GJ01AB2201", nameModel: "TRK-12", type: "Truck", maxLoadCapacity: 6000, odometer: 210000, acquisitionCost: 2600000, status: "AVAILABLE", region: "East" } });
  console.log("✔ Seeded 7 vehicles");

  // 3. Drivers
  const alex = await prisma.driver.create({ data: { name: "Alex", licenseNumber: "DL-88213", licenseCategory: "LMV", licenseExpiryDate: date("2028-12-01"), contactNumber: "98765 43210", safetyScore: 96, status: "AVAILABLE" } });
  await prisma.driver.create({ data: { name: "John", licenseNumber: "DL-44120", licenseCategory: "HMV", licenseExpiryDate: date("2025-03-01"), contactNumber: "98220 11220", safetyScore: 81, status: "SUSPENDED" } });
  const priya = await prisma.driver.create({ data: { name: "Priya", licenseNumber: "DL-77031", licenseCategory: "LMV", licenseExpiryDate: date("2027-08-01"), contactNumber: "99110 33440", safetyScore: 99, status: "ON_TRIP" } });
  const suresh = await prisma.driver.create({ data: { name: "Suresh", licenseNumber: "DL-90045", licenseCategory: "HMV", licenseExpiryDate: date("2027-01-01"), contactNumber: "97440 55660", safetyScore: 88, status: "OFF_DUTY" } });
  const ravi = await prisma.driver.create({ data: { name: "Ravi", licenseNumber: "DL-55000", licenseCategory: "LMV", licenseExpiryDate: daysFromNow(20), contactNumber: "90000 12345", safetyScore: 90, status: "AVAILABLE" } });
  console.log("✔ Seeded 5 drivers");

  // 4. Trips (statuses kept consistent with vehicle/driver states set above)
  // Completed: VAN-05 + Alex (the §5 example: cargo 450 <= 500). Revenue captured.
  const t1 = await prisma.trip.create({ data: { source: "Gandhinagar Depot", destination: "Ahmedabad Hub", vehicleId: van05.id, driverId: alex.id, cargoWeight: 450, plannedDistance: 38, status: "COMPLETED", startOdometer: 74412, finalOdometer: 74450, fuelConsumed: 5, revenue: 26000, dispatchedAt: date("2026-07-07"), completedAt: date("2026-07-07") } });
  // Dispatched: TRUCK-11 + Priya (both On Trip).
  await prisma.trip.create({ data: { source: "Vatva Industrial Area", destination: "Sanand Warehouse", vehicleId: truck11.id, driverId: priya.id, cargoWeight: 3000, plannedDistance: 120, status: "DISPATCHED", startOdometer: 182000, dispatchedAt: date("2026-07-11") } });
  // Draft: MINI-08 + Ravi.
  await prisma.trip.create({ data: { source: "Mansa", destination: "Kalol Depot", vehicleId: mini08.id, driverId: ravi.id, cargoWeight: 200, plannedDistance: 25, status: "DRAFT" } });
  // Cancelled.
  await prisma.trip.create({ data: { source: "Nadiad", destination: "Anand", vehicleId: truck04.id, driverId: suresh.id, cargoWeight: 800, plannedDistance: 45, status: "CANCELLED", cancelledAt: date("2026-07-06") } });
  // Completed: TRK-12 (revenue history).
  const t5 = await prisma.trip.create({ data: { source: "Rajkot", destination: "Morbi", vehicleId: trk12.id, driverId: alex.id, cargoWeight: 500, plannedDistance: 60, status: "COMPLETED", startOdometer: 209940, finalOdometer: 210000, fuelConsumed: 22, revenue: 42000, dispatchedAt: date("2026-06-20"), completedAt: date("2026-06-20") } });
  console.log("✔ Seeded 5 trips");

  // 5. Maintenance
  await prisma.maintenanceLog.create({ data: { vehicleId: mini03.id, type: "Oil Change", description: "Routine oil change", cost: 2500, status: "OPEN", odometerAtService: 66000, openedAt: date("2026-07-09") } });
  await prisma.maintenanceLog.create({ data: { vehicleId: truck11.id, type: "Engine Repair", description: "Coolant + belt", cost: 18000, status: "CLOSED", odometerAtService: 181500, openedAt: date("2026-06-10"), closedAt: date("2026-06-14") } });
  await prisma.maintenanceLog.create({ data: { vehicleId: trk12.id, type: "Tyre Replacement", cost: 6200, status: "CLOSED", openedAt: date("2026-06-01"), closedAt: date("2026-06-02") } });
  console.log("✔ Seeded 3 maintenance records");

  // 6. Fuel logs
  await prisma.fuelLog.createMany({ data: [
    { vehicleId: van05.id, tripId: t1.id, liters: 42, cost: 3150, date: date("2026-07-05"), odometer: 74400 },
    { vehicleId: truck11.id, liters: 110, cost: 8400, date: date("2026-07-06"), odometer: 181900 },
    { vehicleId: mini08.id, liters: 28, cost: 2050, date: date("2026-07-06"), odometer: 32800 },
    { vehicleId: trk12.id, tripId: t5.id, liters: 90, cost: 6800, date: date("2026-06-20"), odometer: 209900 },
    { vehicleId: truck04.id, liters: 60, cost: 4500, date: date("2026-07-02"), odometer: 94800 },
  ] });
  console.log("✔ Seeded 5 fuel logs");

  // 7. Expenses (tolls / parking / misc)
  await prisma.expense.createMany({ data: [
    { vehicleId: van05.id, tripId: t1.id, category: "TOLL", amount: 120, date: date("2026-07-07") },
    { vehicleId: trk12.id, tripId: t5.id, category: "TOLL", amount: 340, date: date("2026-06-20") },
    { vehicleId: trk12.id, category: "PARKING", amount: 150, date: date("2026-06-21") },
    { vehicleId: truck11.id, category: "MISC", amount: 200, date: date("2026-07-08") },
  ] });
  console.log("✔ Seeded 4 expenses");

  console.log("\n🌱 Demo data ready.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
