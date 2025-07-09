import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/users(.*)",
  "/settings(.*)",
  "/orders(.*)",
  "/tills(.*)",
  "/currencies(.*)",
  "/denominations(.*)",
  "/customers(.*)",
  "/accept-invitation(.*)",
  "/server"
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  
  // Redirect authenticated users from root to orders page
  if (req.nextUrl.pathname === "/" && userId) {
    return NextResponse.redirect(new URL("/orders", req.url));
  }
  
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
