import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname.startsWith("/login");
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");

  // Allow auth API routes
  if (isApiAuth) {
    return NextResponse.next();
  }

  // If on login page and logged in, redirect to home
  if (isOnLogin && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // If on login page and not logged in, allow
  if (isOnLogin) {
    return NextResponse.next();
  }

  // If not logged in and not on login, redirect to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
