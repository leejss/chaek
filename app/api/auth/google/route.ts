import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
import { isString } from "@/lib/typeGuards";
import { db } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import { issueAccessJWT, verifyGoogleIdToken } from "@/lib/auth";
import {
  accessAuthCookieOptions,
  accessTokenConfig,
  refreshAuthCookieOptions,
  refreshTokenConfig,
} from "@/lib/authTokens";
import { generateRandomToken, sha256Hex } from "@/utils";
import { add, Duration } from "date-fns";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);

    const idToken = (body as { id_token?: unknown })?.id_token;
    if (!isString(idToken) || idToken.length === 0) {
      throw new HttpError(400, "Missing id_token");
    }

    const googleClientId = env.GOOGLE_CLIENT_ID;
    const ourJwtSecret = new TextEncoder().encode(env.OUR_JWT_SECRET);

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

    const jwt = await issueAccessJWT({
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
      expiresAt: add(new Date(), refreshTokenConfig.duration as Duration),
    });

    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set(accessTokenConfig.name, jwt, {
      ...accessAuthCookieOptions,
    });

    res.cookies.set(refreshTokenConfig.name, refreshToken, {
      ...refreshAuthCookieOptions,
    });

    return res;
  } catch (error) {
    console.error("Google auth error:", error);

    const httpError =
      error instanceof InvalidJsonError
        ? new HttpError(400, "Invalid JSON")
        : error instanceof HttpError
        ? error
        : null;

    if (httpError) {
      return NextResponse.json(
        { error: httpError.publicMessage, ok: false },
        { status: httpError.status },
      );
    }

    return NextResponse.json(
      { error: "Internal server error", ok: false },
      { status: 500 },
    );
  }
}
