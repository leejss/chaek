import { env } from "./env";

export const accessTokenConfig = {
  name: "bookmaker_access_token",
  duration: "15m",
  maxAge: 15 * 60,
};

export const refreshTokenConfig = {
  name: "bookmaker_refresh_token",
  duration: { days: 30 },
  maxAge: 30 * 24 * 60 * 60,
};

export const commonAuthCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const accessAuthCookieOptions = {
  ...commonAuthCookieOptions,
  maxAge: accessTokenConfig.maxAge,
};

export const refreshAuthCookieOptions = {
  ...commonAuthCookieOptions,
  maxAge: refreshTokenConfig.maxAge,
};
