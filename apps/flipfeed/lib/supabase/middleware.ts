import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Edge middleware must finish quickly; a slow/hung Supabase call causes Vercel MIDDLEWARE_INVOCATION_TIMEOUT. */
const SESSION_REFRESH_BUDGET_MS = 4500;

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const refresh = supabase.auth.getUser();
  const deadline = new Promise<void>((resolve) => {
    setTimeout(resolve, SESSION_REFRESH_BUDGET_MS);
  });

  try {
    await Promise.race([refresh, deadline]);
  } catch {
    /* getUser failed; still return response so the request is not stuck */
  }

  return response;
}
