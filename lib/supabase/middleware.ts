import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_PATHS_BY_ROLE,
  canAccessPath,
  getDefaultRouteForRole,
  type StaffRole,
} from "@/lib/auth/roles";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute =
    pathname.startsWith("/login") || pathname.startsWith("/booking");

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/tables";
    return NextResponse.redirect(url);
  }

  // Role-based route guard — non-managers are bounced off restricted paths
  if (user && !isPublicRoute) {
    const role =
      (user.user_metadata?.role as StaffRole | undefined) ?? "waiter";
    if (role !== "manager") {
      const allowed = ALLOWED_PATHS_BY_ROLE[role] ?? [];
      if (allowed.length > 0 && !canAccessPath(role, pathname, allowed)) {
        const url = request.nextUrl.clone();
        url.pathname = getDefaultRouteForRole(role);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
