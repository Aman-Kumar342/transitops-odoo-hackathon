import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, PUBLIC_PATHS } from "@/lib/auth/constants";
import { verifySession } from "@/lib/auth/jwt";

/**
 * Global authentication gate (deny-by-default). Runs in the Edge runtime, so it only
 * uses edge-safe modules (jose, no Prisma/bcrypt). It enforces authn only; per-route
 * authorization (RBAC) is enforced in handlers via guards. (guidelines.md §14, §16)
 *
 *  - Public paths pass through.
 *  - Unauthenticated API requests → 401 JSON envelope.
 *  - Unauthenticated page requests → redirect to /login?next=<path>.
 *  - Authenticated user hitting /login → redirect home.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // Already-authenticated users shouldn't see the login page.
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
          },
        },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
