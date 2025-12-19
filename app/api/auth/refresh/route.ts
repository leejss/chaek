import { HttpError } from "@/lib/errors";
import { db } from "@/db";
import { refreshTokens, users } from "@/db/schema";
import { issueAccessJWT } from "@/lib/auth";
import {
  accessAuthCookieOptions,
  accessTokenConfig,
  refreshAuthCookieOptions,
  refreshTokenConfig,
} from "@/lib/authTokens";
import { generateRandomToken, sha256Hex } from "@/utils";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { add, Duration } from "date-fns";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(refreshTokenConfig.name)?.value;
    if (!refreshToken) {
      throw new HttpError(401, "Missing refresh token");
    }

    const refreshTokenHash = await sha256Hex(refreshToken);

    // Select hash from refresh token
    const [tokenRow] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, refreshTokenHash),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!tokenRow) {
      throw new HttpError(401, "Invalid refresh token");
    }
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRow.userId))
      .limit(1);

    if (!userRow) {
      throw new HttpError(401, "User not found");
    }

    const newRefreshToken = generateRandomToken();
    const newRefreshTokenHash = await sha256Hex(newRefreshToken);

    //새로운 refresh token을 insert, 기존 refresh token을 업데이트
    await db.transaction(async (tx) => {
      const now = new Date();
      const [newTokenRow] = await tx
        .insert(refreshTokens)
        .values({
          userId: userRow.id,
          tokenHash: newRefreshTokenHash,
          expiresAt: add(now, refreshTokenConfig.duration as Duration),
        })
        .returning();
      if (!newTokenRow) {
        throw new Error("Failed to insert new refresh token");
      }
      await tx
        .update(refreshTokens)
        .set({
          revokedAt: now,
          replacedByTokenId: newTokenRow.id,
        })
        .where(eq(refreshTokens.id, tokenRow.id));
    });

    // Create response and return it
    const res = NextResponse.json({ ok: true }, { status: 200 });

    const ourJwtSecret = new TextEncoder().encode(env.OUR_JWT_SECRET);
    const newAccessJwt = await issueAccessJWT({
      userId: userRow.id,
      email: userRow.email,
      secret: ourJwtSecret,
    });

    res.cookies.set(accessTokenConfig.name, newAccessJwt, {
      ...accessAuthCookieOptions,
    });

    res.cookies.set(refreshTokenConfig.name, newRefreshToken, {
      ...refreshAuthCookieOptions,
    });
    return res;
  } catch (error) {
    console.error("Refresh auth error:", error);
    const res =
      error instanceof HttpError
        ? NextResponse.json(
            { ok: false, error: error.publicMessage },
            { status: error.status },
          )
        : NextResponse.json(
            { ok: false, error: "Internal server error" },
            { status: 500 },
          );

    // 실패 시 쿠키 정리(선택이지만 UX/보안상 권장)
    // clearAuthCookies(res);
    res.cookies.set(accessTokenConfig.name, "", {
      ...accessAuthCookieOptions,
      maxAge: 0,
    });
    res.cookies.set(refreshTokenConfig.name, "", {
      ...refreshAuthCookieOptions,
      maxAge: 0,
    });
    return res;
  }
}
