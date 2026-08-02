import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getGoogleOauthConfig,
  getOauthStateCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
  sanitizeAuthReturnTo,
} from "@/lib/auth/config";
import { createGoogleAuthorizationUrl } from "@/lib/auth/google";
import { createOauthState } from "@/lib/auth/oauth-state";
import {
  createSignInPath,
  DEFAULT_AUTH_RETURN_TO,
} from "@/lib/auth/redirects";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let returnTo = DEFAULT_AUTH_RETURN_TO;

  try {
    returnTo = sanitizeAuthReturnTo(
      request.nextUrl.searchParams.get("returnTo"),
    );
    getGoogleOauthConfig();

    const oauthState = await createOauthState(returnTo);
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
      new URL(
        createSignInPath({ error: "configuration", returnTo }),
        request.url,
      ),
    );
    response.headers.set("cache-control", "no-store");

    return response;
  }
}
