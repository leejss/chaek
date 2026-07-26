import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getAuthConfig,
  getOauthStateCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
} from "@/lib/auth/config";
import { createGoogleAuthorizationUrl } from "@/lib/auth/google";
import { createOauthState } from "@/lib/auth/oauth-state";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    getAuthConfig();

    const oauthState = await createOauthState(
      request.nextUrl.searchParams.get("returnTo"),
    );
    const authorizationUrl = createGoogleAuthorizationUrl(oauthState);
    const response = NextResponse.redirect(authorizationUrl);

    response.cookies.set(
      OAUTH_STATE_COOKIE_NAME,
      oauthState.state,
      getOauthStateCookieOptions(),
    );
    response.headers.set("cache-control", "no-store");

    return response;
  } catch (error) {
    console.error("[auth/google] Failed to start OAuth flow.", {
      error: error instanceof Error ? error.name : "UnknownError",
    });

    const response = NextResponse.redirect(
      new URL("/sign-in?error=configuration", request.url),
    );
    response.headers.set("cache-control", "no-store");

    return response;
  }
}
