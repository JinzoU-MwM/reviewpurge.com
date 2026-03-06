import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SESSION_COOKIE,
  TRUST_COPY_COOKIE,
  assignTrustCopyVariant,
  isTrustCopyVariant,
} from "@/lib/experiments/trust-copy";

const isProtectedAdminRoute = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/");

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`.slice(0, 24);
}

function ensureExperimentCookies(request: NextRequest, response: NextResponse) {
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existingSession || createSessionId();
  if (!existingSession) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  const existingVariant = request.cookies.get(TRUST_COPY_COOKIE)?.value;
  if (existingVariant && isTrustCopyVariant(existingVariant)) return;

  const assigned = assignTrustCopyVariant(sessionId);
  response.cookies.set(TRUST_COPY_COOKIE, assigned, {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  ensureExperimentCookies(request, response);

  if (!isProtectedAdminRoute(pathname) || pathname.startsWith("/admin/login")) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
