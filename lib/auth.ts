import { cookies } from "next/headers";
import { HttpError } from "@/lib/errors";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { accessTokenConfig } from "./authTokens";
import { serverEnv } from "@/lib/env";
import { type NextRequest } from "next/server";

export { accessTokenConfig, refreshTokenConfig } from "./authTokens";

export const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export const GOOGLE_ISSUERS = [
  "https://accounts.google.com",
  "accounts.google.com",
] as const;

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
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
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

export async function verifyAccessJWT(token: string, secret: Uint8Array) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: "bookmaker",
      audience: "bookmaker-web",
    });
    const { sub } = payload;
    if (typeof sub !== "string") {
      throw new HttpError(401, "Invalid credentials");
    }
    return { userId: sub };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(401, "Invalid credentials");
  }
}

export async function authenticate(req: NextRequest) {
  const accessToken = req.cookies.get(accessTokenConfig.name)?.value;
  if (!accessToken) {
    throw new HttpError(401, "Missing access token");
  }

  const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
  return await verifyAccessJWT(accessToken, secret);
}

export async function getUserId() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessTokenConfig.name)?.value;
  if (!accessToken) {
    throw new HttpError(401, "Missing access token");
  }

  const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
  const { userId } = await verifyAccessJWT(accessToken, secret);
  return userId;
}
