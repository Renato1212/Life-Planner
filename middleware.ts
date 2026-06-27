import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Refreshes the Supabase auth session cookie on navigation. No-op when the
// backend isn't configured, so the local-storage app is unaffected.
export async function middleware(request: NextRequest) {
  if (!URL || !ANON) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest).*)"],
};
