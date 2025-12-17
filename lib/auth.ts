import { HttpError } from "@/lib/errors";
import { isString } from "@/lib/typeGuards";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";

export const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export const GOOGLE_ISSUERS = [
  "https://accounts.google.com",
  "accounts.google.com",
] as const;

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

export async function verifyGoogleIdToken(
  idToken: string,
  googleClientId: string,
) {
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      audience: googleClientId,
      issuer: [...GOOGLE_ISSUERS],
    });

    if (payload.email_verified !== true) {
      throw new HttpError(401, "Invalid credentials");
    }
    if (!isString(payload.sub) || !isString(payload.email)) {
      throw new HttpError(401, "Invalid credentials");
    }

    return { sub: payload.sub, email: payload.email };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(401, "Invalid credentials");
  }
}

export async function issueAccessJWT(params: {
  userId: string;
  email: string;
  secret: Uint8Array;
}) {
  const jwt = new SignJWT({ email: params.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("bookmaker")
    .setAudience("bookmaker-web")
    .setSubject(params.userId)
    .setIssuedAt()
    .setExpirationTime(accessTokenConfig.duration);

  // Optional, but useful for debugging / revocation strategies.
  if (typeof globalThis.crypto?.randomUUID === "function") {
    jwt.setJti(globalThis.crypto.randomUUID());
  }

  return jwt.sign(params.secret);
}
