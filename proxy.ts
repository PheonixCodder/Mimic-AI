import {
  getAccessTokenCookieName,
  updateSession,
  type CookieStore,
} from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

function hasSession(request: NextRequest) {
  const token = request.cookies.get(getAccessTokenCookieName())?.value;
  return Boolean(token);
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  await updateSession({
    requestCookies: request.cookies as unknown as CookieStore,
    responseCookies: response.cookies as unknown as CookieStore,
  });

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const sessionExists = hasSession(request);

  if (isProtected && !sessionExists) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && sessionExists) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
