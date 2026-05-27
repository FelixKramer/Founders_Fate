import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const AUTH_PAGES = ["/login", "/signup"];

// Pages that require an authenticated, non-suspended user.
const PROTECTED_PREFIXES = [
  "/hub",
  "/sim",
  "/profile",
  "/premortem",
  "/onboarding",
  "/dashboard", // legacy boilerplate path — middleware redirects to /hub
];

// Pages anyone can hit even when logged out / suspended.
const PUBLIC_PREFIXES = ["/sim/share/"]; // /sim/share/<code> read-only page

// Admin console.
const ADMIN_PREFIX = "/admin";

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // /sim/share/<code> is public — short-circuit before auth checks.
  if (startsWithAny(pathname, PUBLIC_PREFIXES)) {
    return NextResponse.next();
  }

  // Bounce logged-in users away from auth pages.
  if (startsWithAny(pathname, AUTH_PAGES) && token) {
    return NextResponse.redirect(new URL("/hub", request.url));
  }

  // Legacy /dashboard → /hub.
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/hub", request.url));
  }

  // Admin console: require admin or support role.
  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = (token as { role?: string }).role;
    if (role !== "admin" && role !== "support") {
      return NextResponse.redirect(new URL("/hub", request.url));
    }
    if ((token as { suspended?: boolean }).suspended) {
      return NextResponse.redirect(new URL("/suspended", request.url));
    }
    return NextResponse.next();
  }

  // Protected app pages.
  if (startsWithAny(pathname, PROTECTED_PREFIXES)) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if ((token as { suspended?: boolean }).suspended) {
      return NextResponse.redirect(new URL("/suspended", request.url));
    }

    // M3.1: Redirect to onboarding if the user hasn't completed it yet.
    // Only applies to /hub (not to /onboarding itself, to avoid redirect loops).
    if (
      (pathname === "/hub" || pathname.startsWith("/hub/")) &&
      !request.cookies.get("ff_onboarding_done")?.value
    ) {
      return NextResponse.redirect(new URL("/onboarding/archetype", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/signup",
    "/hub/:path*",
    "/sim/:path*",
    "/profile/:path*",
    "/premortem/:path*",
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
