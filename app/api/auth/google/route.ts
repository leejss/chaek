import { requireEnv } from "@/lib/env";
import { HttpError } from "@/lib/errors";
import { readJson } from "@/lib/request";
import { isString } from "@/lib/typeGuards";
import { db } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import {
  accessTokenConfig,
  issueAccessJWT,
  refreshTokenConfig,
  verifyGoogleIdToken,
} from "@/lib/auth";
import { generateRandomToken, sha256Hex } from "@/utils";
import { add, Duration } from "date-fns";
import { NextResponse } from "next/server";

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
