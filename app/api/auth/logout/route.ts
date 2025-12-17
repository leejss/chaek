import { HttpError } from "@/lib/errors";
import { db } from "@/db";
import { refreshTokens } from "@/db/schema";
import {
  accessAuthCookieOptions,
  accessTokenConfig,
  refreshAuthCookieOptions,
  refreshTokenConfig,
} from "@/lib/authTokens";
import { sha256Hex } from "@/utils";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(refreshTokenConfig.name)?.value;

    if (typeof refreshToken === "string" && refreshToken.trim().length > 0) {
      const refreshTokenHash = await sha256Hex(refreshToken);
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.tokenHash, refreshTokenHash),
            isNull(refreshTokens.revokedAt),
          ),
        );
    }

    const res = NextResponse.json({ ok: true }, { status: 200 });

    res.cookies.set(accessTokenConfig.name, "", {
      ...accessAuthCookieOptions,
      maxAge: 0,
    });
    res.cookies.set(refreshTokenConfig.name, "", {
      ...refreshAuthCookieOptions,
      maxAge: 0,
    });

    return res;
  } catch (error) {
    console.error("Logout error:", error);

    const status = error instanceof HttpError ? error.status : 500;
    const message =
      error instanceof HttpError
        ? error.publicMessage
        : "Internal server error";

    const res = NextResponse.json({ ok: false, error: message }, { status });

    // 에러가 발생해도 토큰은 삭제한다.
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
