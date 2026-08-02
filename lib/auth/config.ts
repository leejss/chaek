import "server-only";

import {
  DEFAULT_AUTH_RETURN_TO,
  sanitizeAuthReturnToValue,
  sanitizeReturnToValue,
} from "./redirects";

export const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_ENDPOINT =
  "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_ISSUERS = [
  "https://accounts.google.com",
  "accounts.google.com",
] as const;

export const OAUTH_STATE_COOKIE_NAME = "chaek_oauth_state";
export const SESSION_COOKIE_NAME = "chaek_session";

export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

type ApplicationConfig = {
  baseUrl: URL;
  secureCookies: boolean;
};

type GoogleOauthConfig = {
  callbackUrl: string;
  googleClientId: string;
  googleClientSecret: string;
};

let applicationConfig: ApplicationConfig | undefined;
let googleOauthConfig: GoogleOauthConfig | undefined;

function requireEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} environment variable is not configured.`);
  }

  return value;
}

export function getApplicationConfig() {
  if (applicationConfig) {
    return applicationConfig;
  }

  const baseUrl = new URL(requireEnvironmentVariable("AUTH_BASE_URL"));

  if (baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
    throw new Error("AUTH_BASE_URL must contain only an origin.");
  }

  if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") {
    throw new Error("AUTH_BASE_URL must use HTTPS in production.");
  }

  applicationConfig = {
    baseUrl,
    secureCookies: baseUrl.protocol === "https:",
  };

  return applicationConfig;
}

export function getGoogleOauthConfig() {
  if (googleOauthConfig) {
    return googleOauthConfig;
  }

  const { baseUrl } = getApplicationConfig();

  googleOauthConfig = {
    callbackUrl: new URL("/api/auth/google/callback", baseUrl).toString(),
    googleClientId: requireEnvironmentVariable("GOOGLE_OAUTH_CLIENT_ID"),
    googleClientSecret: requireEnvironmentVariable(
      "GOOGLE_OAUTH_CLIENT_SECRET",
    ),
  };

  return googleOauthConfig;
}

export function sanitizeReturnTo(value: string | null, fallback = "/") {
  return sanitizeReturnToValue(
    value,
    getApplicationConfig().baseUrl,
    fallback,
  );
}

export function sanitizeAuthReturnTo(
  value: string | null,
  fallback = DEFAULT_AUTH_RETURN_TO,
) {
  return sanitizeAuthReturnToValue(
    value,
    getApplicationConfig().baseUrl,
    fallback,
  );
}

export function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const { baseUrl } = getApplicationConfig();

  if (origin !== baseUrl.origin) {
    throw new Error("Untrusted request origin.");
  }
}

export function getOauthStateCookieOptions() {
  return {
    httpOnly: true,
    maxAge: OAUTH_STATE_TTL_SECONDS,
    path: "/api/auth/google",
    sameSite: "lax" as const,
    secure: getApplicationConfig().secureCookies,
  };
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
    priority: "high" as const,
    sameSite: "lax" as const,
    secure: getApplicationConfig().secureCookies,
  };
}
