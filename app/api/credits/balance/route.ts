import { NextRequest, NextResponse } from "next/server";
import { getUserBalance } from "@/lib/credits/operations";
import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { serverEnv } from "@/lib/env";

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get(accessTokenConfig.name)?.value;
    if (!accessToken) {
      throw new HttpError(401, "Missing access token");
    }

    const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
    const { userId } = await verifyAccessJWT(accessToken, secret);

    const balance = await getUserBalance(userId);

    return NextResponse.json({
      ok: true,
      balance: balance.balance,
      freeCredits: balance.freeCredits,
    });
  } catch (error) {
    console.error("Balance fetch error:", error);

    const httpError = error instanceof HttpError ? error : null;

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
