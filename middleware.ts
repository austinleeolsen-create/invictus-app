import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  if (process.env.DEMO_ONLY === "true") {
    if (request.nextUrl.pathname === "/demo") return NextResponse.next();
    return NextResponse.redirect(new URL("/demo", request.url));
  }
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("is_active").eq("id", user.id).maybeSingle();
    if (profile?.is_active !== true) {
      await supabase.auth.signOut();
      if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "This account no longer has access to the Hub." }, { status: 403 });
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("This account no longer has access to the Hub.")}`, request.url));
    }
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
