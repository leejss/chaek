import { NextRequest, NextResponse } from "next/server";
import { getCreditTransactions } from "@/lib/credits/operations";
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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const transactions = await getCreditTransactions(userId, limit, offset);

    return NextResponse.json({
      ok: true,
      transactions,
    });
  } catch (error) {
    console.error("Transactions fetch error:", error);

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
