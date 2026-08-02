import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  GOOGLE_ISSUERS,
  getApplicationConfig,
  getSessionCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/config";
import { OAuthAccountConflictError, OAuthFlowError } from "@/lib/auth/errors";
import {
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken,
} from "@/lib/auth/google";
import { synchronizeGoogleAccount } from "@/lib/auth/google-account";
import { consumeOauthState } from "@/lib/auth/oauth-state";
import {
  type AuthErrorCode,
  createSignInPath,
  DEFAULT_AUTH_RETURN_TO,
} from "@/lib/auth/redirects";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

function clearOauthStateCookie(response: NextResponse, request: NextRequest) {
  let secure = request.nextUrl.protocol === "https:";

  try {
    secure = getApplicationConfig().secureCookies;
  } catch {
    // The callback still needs to expire a stale cookie when auth is misconfigured.
  }

  response.cookies.set(OAUTH_STATE_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/api/auth/google",
    sameSite: "lax",
    secure,
  });
}

function createErrorRedirect(
  request: NextRequest,
  code: AuthErrorCode,
  returnTo = DEFAULT_AUTH_RETURN_TO,
) {
  let baseUrl: URL = request.nextUrl;

  try {
    baseUrl = getApplicationConfig().baseUrl;
  } catch {
    // Falling back to the request URL keeps configuration errors observable.
  }

  const response = NextResponse.redirect(
    new URL(createSignInPath({ error: code, returnTo }), baseUrl),
  );

  clearOauthStateCookie(response, request);
  response.headers.set("cache-control", "no-store");

  return response;
}

export async function GET(request: NextRequest) {
  const receivedState = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (!receivedState || !cookieState) {
    return createErrorRedirect(request, "invalid_state");
  }

  let returnTo = DEFAULT_AUTH_RETURN_TO;

  try {
    const oauthState = await consumeOauthState(receivedState, cookieState);

    if (!oauthState) {
      return createErrorRedirect(request, "invalid_state");
    }

    returnTo = oauthState.returnTo;

    const providerError = request.nextUrl.searchParams.get("error");

    if (providerError) {
      return createErrorRedirect(
        request,
        providerError === "access_denied" ? "access_denied" : "oauth_failed",
        returnTo,
      );
    }

    const issuer = request.nextUrl.searchParams.get("iss");

    if (issuer && !GOOGLE_ISSUERS.some((candidate) => candidate === issuer)) {
      throw new OAuthFlowError("issuer_mismatch");
    }

    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
      throw new OAuthFlowError("missing_authorization_code");
    }

    const tokenResponse = await exchangeGoogleAuthorizationCode({
      code,
      codeVerifier: oauthState.codeVerifier,
    });
    const profile = await verifyGoogleIdToken({
      idToken: tokenResponse.idToken,
      nonce: oauthState.nonce,
    });
    const user = await synchronizeGoogleAccount(profile, tokenResponse.scope);
    const previousSessionToken =
      request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = await createSession(user.id, previousSessionToken);
    const { baseUrl } = getApplicationConfig();
    const response = NextResponse.redirect(
      new URL(oauthState.returnTo, baseUrl),
    );

    clearOauthStateCookie(response, request);
    response.cookies.set(
      SESSION_COOKIE_NAME,
      session.token,
      getSessionCookieOptions(),
    );
    response.headers.set("cache-control", "no-store");

    return response;
  } catch (error) {
    console.error("[auth/google/callback] OAuth callback failed.", {
      error:
        error instanceof OAuthFlowError
          ? error.code
          : error instanceof Error
            ? error.name
            : "UnknownError",
    });

    if (error instanceof OAuthAccountConflictError) {
      return createErrorRedirect(request, "account_conflict", returnTo);
    }

    return createErrorRedirect(request, "oauth_failed", returnTo);
  }
}
