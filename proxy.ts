import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// NextAuth v5 stores an encrypted JWE session token — we can only check existence, not decode role
// Role-based guards for admin/manager routes are enforced in each API route and page via auth()
// The proxy only handles: redirect unauthenticated users, allow public routes
function hasSessionToken(req: NextRequest) {
  return (
    !!req.cookies.get("authjs.session-token")?.value ||
    !!req.cookies.get("__Secure-authjs.session-token")?.value
  );
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public and auth-internal routes
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!hasSessionToken(req)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based guards (admin/manager) are enforced server-side in API routes and page components
  // The encrypted JWE token cannot be decoded here without the secret
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
