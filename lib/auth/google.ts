import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

import {
  GOOGLE_AUTHORIZATION_ENDPOINT,
  GOOGLE_ISSUERS,
  GOOGLE_JWKS_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  getAuthConfig,
} from "./config";
import { constantTimeEqual, createPkceChallenge } from "./crypto";
import { OAuthFlowError } from "./errors";

const googleJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_ENDPOINT));

type GoogleTokenResponse = {
  access_token?: unknown;
  expires_in?: unknown;
  id_token?: unknown;
  scope?: unknown;
  token_type?: unknown;
};

export type GoogleProfile = {
  email: string;
  emailVerified: true;
  image: string | null;
  name: string;
  subject: string;
};

export function createGoogleAuthorizationUrl({
  codeVerifier,
  nonce,
  state,
}: {
  codeVerifier: string;
  nonce: string;
  state: string;
}) {
  const { callbackUrl, googleClientId } = getAuthConfig();
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);

  url.search = new URLSearchParams({
    access_type: "online",
    client_id: googleClientId,
    code_challenge: createPkceChallenge(codeVerifier),
    code_challenge_method: "S256",
    include_granted_scopes: "true",
    nonce,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    state,
  }).toString();

  return url;
}

export async function exchangeGoogleAuthorizationCode({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}) {
  const { callbackUrl, googleClientId, googleClientSecret } = getAuthConfig();
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: callbackUrl,
    }),
    cache: "no-store",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  });

  const body = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || typeof body.id_token !== "string") {
    throw new OAuthFlowError("token_exchange_failed");
  }

  return {
    idToken: body.id_token,
    scope: typeof body.scope === "string" ? body.scope : null,
  };
}

export async function verifyGoogleIdToken({
  idToken,
  nonce,
}: {
  idToken: string;
  nonce: string;
}): Promise<GoogleProfile> {
  const { googleClientId } = getAuthConfig();
  const { payload } = await jwtVerify(idToken, googleJwks, {
    algorithms: ["RS256"],
    audience: googleClientId,
    issuer: [...GOOGLE_ISSUERS],
  });

  if (
    typeof payload.nonce !== "string" ||
    !constantTimeEqual(payload.nonce, nonce)
  ) {
    throw new OAuthFlowError("nonce_mismatch");
  }

  if (typeof payload.azp === "string" && payload.azp !== googleClientId) {
    throw new OAuthFlowError("authorized_party_mismatch");
  }

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    payload.email_verified !== true
  ) {
    throw new OAuthFlowError("invalid_google_profile");
  }

  return {
    email: payload.email,
    emailVerified: true,
    image: typeof payload.picture === "string" ? payload.picture : null,
    name:
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : payload.email,
    subject: payload.sub,
  };
}
