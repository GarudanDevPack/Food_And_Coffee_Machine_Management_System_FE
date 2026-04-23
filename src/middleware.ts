import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const rawRole = token ? ((token.role as any)?.id ?? token.role) : null;
    const roleId = rawRole != null ? Number(rawRole) : null;

    // Role-based redirect from root
    if (pathname === "/") {
      if (roleId === 4)
        return NextResponse.redirect(new URL("/agent/dashboard", req.url));
      if (roleId === 5)
        return NextResponse.redirect(new URL("/customer/wallet", req.url));
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect /agent/* — only role=4 (agent)
    if (pathname.startsWith("/agent/") || pathname === "/agent") {
      if (roleId !== 4) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Protect /customer/* — only role=5 (customer)
    if (pathname.startsWith("/customer/") || pathname === "/customer") {
      if (roleId !== 5) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Protect /dashboard and admin routes — roles 1, 2, 3 only
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/machines") ||
      pathname.startsWith("/orders") ||
      pathname.startsWith("/items") ||
      pathname.startsWith("/users") ||
      pathname.startsWith("/memberships") ||
      pathname.startsWith("/wallet") ||
      pathname.startsWith("/alerts") ||
      pathname.startsWith("/outlets") ||
      pathname.startsWith("/promotions")
    ) {
      if (roleId === 4)
        return NextResponse.redirect(new URL("/agent/dashboard", req.url));
      if (roleId === 5)
        return NextResponse.redirect(new URL("/customer/wallet", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Allow auth pages and NextAuth API without token
        if (pathname.startsWith("/auth/")) return true;
        if (pathname.startsWith("/api/auth/")) return true;
        // Require token for everything else
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/login",
    },
  },
);

export const config = {
  // Exclude NextAuth's own API routes from the withAuth middleware.
  // Without this, withAuth intercepts /api/auth/session (no token yet) and
  // redirects it to the sign-in page, breaking session initialisation entirely.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/|api/auth/).*)"],
};
