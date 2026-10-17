import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

export function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname === "/registro" || pathname === "/auth/confirm";
}
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      response.headers.set("Cache-Control", "private, no-store");
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  const { data: { user }, error } = await supabase.auth.getUser();
  if ((!user || error) && !isPublicPath(request.nextUrl.pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/login";
    destination.search = "";
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  return response;
}
