import { serverEnv } from "./env";

export const accessTokenConfig = {
  name: "bookmaker_access_token",
  duration: "60m",
  maxAge: 60 * 60,
};

export const refreshTokenConfig = {
  name: "bookmaker_refresh_token",
  duration: { days: 30 },
  maxAge: 30 * 24 * 60 * 60,
};

const baseCookieOptions = {
  httpOnly: true,
  secure: serverEnv.NODE_ENV === "production",
  path: "/",
};

export const authCookieOptions = {
  ui: {
    ...baseCookieOptions,
    sameSite: "lax" as const,
  },
  api: {
    ...baseCookieOptions,
    sameSite: "strict" as const,
  },
};

export const accessAuthCookieOptions = {
  ...authCookieOptions.api,
  maxAge: accessTokenConfig.maxAge,
};

export const refreshAuthCookieOptions = {
  ...authCookieOptions.api,
  maxAge: refreshTokenConfig.maxAge,
};
