import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
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
import { serverEnv } from "@/lib/env";
import { and, eq, isNull } from "drizzle-orm";
import { grantFreeSignupCredits } from "@/lib/credits/operations";

export async function POST(req: Request) {
  try {
    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;
    const body = jsonResult.data;

    const idToken = (body as { id_token?: unknown })?.id_token;
    if (typeof idToken !== "string" || idToken.length === 0) {
      throw new HttpError(400, "Missing id_token");
    }

    const googleClientId = serverEnv.GOOGLE_CLIENT_ID;
    const ourJwtSecret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);

    // Verify Google ID token
    const { sub: googleSub, email } = await verifyGoogleIdToken(
      idToken,
      googleClientId,
    );

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.googleSub, googleSub))
      .limit(1);

    const isNewUser = existingUser.length === 0;

    // 이미 같은 googleSub을 가진 사용자가 있으면 email을 업데이트한다.
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

    if (isNewUser) {
      await grantFreeSignupCredits(user.id);
    }

    const jwt = await issueAccessJWT({
      userId: user.id,
      email: user.email,
      secret: ourJwtSecret,
    });

    const refreshToken = generateRandomToken();
    const refreshTokenHash = await sha256Hex(refreshToken);

    const res = NextResponse.json({ ok: true }, { status: 200 });

    await db.transaction(async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.userId, user.id),
            isNull(refreshTokens.revokedAt),
          ),
        );

      await tx.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: add(new Date(), refreshTokenConfig.duration as Duration),
      });

      res.cookies.set(accessTokenConfig.name, jwt, {
        ...accessAuthCookieOptions,
      });

      res.cookies.set(refreshTokenConfig.name, refreshToken, {
        ...refreshAuthCookieOptions,
      });
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
