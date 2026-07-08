import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSessionToken(req: NextRequest) {
  return (
    !!req.cookies.get("authjs.session-token")?.value ||
    !!req.cookies.get("__Secure-authjs.session-token")?.value
  );
}

function getRoleFromCookie(req: NextRequest) {
  return req.cookies.get("authjs.user-role")?.value ?? null;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow — public, static, auth internals
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

  const loggedIn = hasSessionToken(req);

  if (!loggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = getRoleFromCookie(req);

  // Admin-only routes — only block if we know the role
  if (pathname.startsWith("/admin") && role && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Manager+ routes — only block if we know the role
  if (pathname.startsWith("/manager") && role === "USER") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
