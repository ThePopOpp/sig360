import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createSupabaseMiddlewareClient,
  supabaseAuthEnvPresent,
} from "@/lib/supabase-middleware";

const SESSION_COOKIE = "sig360_session";
const SESSION_SECRET = process.env.SIG360_SESSION_SECRET || "";

// Public routes - no auth needed
const publicRoutes = [
  "/home", // public marketing site
  "/login",
  "/accept-invite",
  "/api/invite/activate",
  "/api/auth",
  "/api/twilio",
  "/api/sms/incoming",
  "/api/sms/status",
  "/api/square/webhook",
  "/uploads/",
  "/api/uploads/",
  "/portal/",
  "/api/portal/",
];

/**
 * Formerly `middleware` in src/middleware.ts. Next 16 renamed the convention to
 * `proxy` (see nextjs.org/docs/messages/middleware-to-proxy); the file and the
 * exported function name both had to change. Behaviour is unchanged.
 */
export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  if (isPublic) {
    return NextResponse.next();
  }

  // Response we can attach refreshed Supabase session cookies to.
  const res = NextResponse.next();

  // Fast path: legacy single-admin cookie.
  let isLoggedIn = req.cookies.get(SESSION_COOKIE)?.value === SESSION_SECRET;

  // Otherwise, check for a Supabase Auth session (and refresh its cookies).
  if (!isLoggedIn && supabaseAuthEnvPresent()) {
    try {
      const supabase = createSupabaseMiddlewareClient(req, res);
      const { data } = await supabase.auth.getUser();
      isLoggedIn = Boolean(data?.user);
    } catch {
      isLoggedIn = false;
    }
  }

  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
