import { NextRequest, NextResponse } from "next/server";
import { getUserBalance } from "@/lib/credits/operations";
import { authenticate } from "@/lib/auth";
import { HttpError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

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
