import { db } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import { HttpError, isString, readJson, requireEnv } from "@/app/_lib/http";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import { NextResponse } from "next/server";
import { generateRandomToken, sha256Hex } from "@/utils";
import { add } from "date-fns";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const GOOGLE_ISSUERS = [
  "https://accounts.google.com",
  "accounts.google.com",
] as const;

const accessTokenConfig = {
  name: "bookmaker_access_token",
  duration: "15m",
  maxAge: 15 * 60,
};

const refreshTokenConfig = {
  name: "bookmaker_refresh_token",
  duration: { days: 30 },
  maxAge: 30 * 24 * 60 * 60,
};

async function verifyGoogleIdToken(idToken: string, googleClientId: string) {
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

async function issueOurJwt(params: {
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

export async function POST(req: Request) {
  try {
    const body = await readJson(req);

    const idToken = (body as { id_token?: unknown })?.id_token;
    if (!isString(idToken) || idToken.length === 0) {
      throw new HttpError(400, "Missing id_token");
    }

    const googleClientId = requireEnv("GOOGLE_CLIENT_ID");
    const ourJwtSecret = new TextEncoder().encode(requireEnv("OUR_JWT_SECRET"));

    // Verify Google ID token
    const { sub: googleSub, email } = await verifyGoogleIdToken(
      idToken,
      googleClientId,
    );

    // Upsert users
    const [user] = await db
      .insert(users)
      .values({ email, googleSub })
      .onConflictDoUpdate({
        target: users.googleSub,
        set: { email },
      })
      .returning();

    if (!user) {
      throw new Error("Failed to upsert user");
    }

    const jwt = await issueOurJwt({
      userId: user.id,
      email: user.email,
      secret: ourJwtSecret,
    });

    // Refresh token을 생성하고 DB에 저장한다.
    const refreshToken = generateRandomToken();
    const refreshTokenHash = await sha256Hex(refreshToken);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: add(new Date(), refreshTokenConfig.duration),
    });

    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set(accessTokenConfig.name, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: accessTokenConfig.maxAge,
      path: "/",
    });

    res.cookies.set(refreshTokenConfig.name, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refreshTokenConfig.maxAge,
      path: "/",
    });

    return res;
  } catch (error) {
    console.error("Google auth error:", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.publicMessage, ok: false },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Internal server error", ok: false },
      { status: 500 },
    );
  }
}
