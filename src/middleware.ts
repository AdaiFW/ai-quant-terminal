import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Supabase is optional — skip middleware if not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder")) {
    return NextResponse.next();
  }
  const { updateSession } = await import("@/lib/supabase/middleware");
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public/ directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
