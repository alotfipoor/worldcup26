import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production"
);

// API routes handle their own authentication — never block them here.
// Only page routes need the session-cookie guard.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through: infra, static assets, API routes, and the login page
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/") ||
    pathname === "/login" ||
    /\.(?:png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const role = payload.role as string;
    const userId = payload.userId as string;

    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const res = NextResponse.next();
    res.headers.set("x-user-id", userId);
    res.headers.set("x-user-role", role);
    return res;
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("session");
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
