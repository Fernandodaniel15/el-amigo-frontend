import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const rid = req.headers.get("x-request-id") || crypto.randomUUID();
  res.headers.set("x-request-id", rid);

  if (req.nextUrl.pathname.startsWith("/dashboard")) {
    const token = req.cookies.get("token")?.value || req.headers.get("authorization");
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
  }
  return res;
}