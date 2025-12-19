import { NextResponse, type NextRequest } from "next/server";
import { accessTokenConfig } from "@/lib/authTokens";

const PROTECTED_PREFIXES = ["/book"];
const GUEST_ONLY_PATHS = ["/login"];
const PUBLIC_LOGIN_PATH = "/login";
const POST_LOGIN_PATH = "/book";

function hasAccessTokenCookie(request: NextRequest) {
  const value = request.cookies.get(accessTokenConfig.name)?.value;
  return typeof value === "string" && value.trim().length > 0;
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isGuestOnlyPath(pathname: string) {
  return GUEST_ONLY_PATHS.includes(pathname);
}

function redirectToLogin(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = PUBLIC_LOGIN_PATH;
  url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

function redirectToPostLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = POST_LOGIN_PATH;
  url.search = "";
  return NextResponse.redirect(url);
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasAccessToken = hasAccessTokenCookie(request);

  if (isProtectedPath(pathname) && !hasAccessToken) {
    return redirectToLogin(request);
  }

  if (isGuestOnlyPath(pathname) && hasAccessToken) {
    return redirectToPostLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/book/:path*", "/login"],
};
