import { db } from "@/db";
import { books } from "@/db/schema";
import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { serverEnv } from "@/lib/env";
import { eq, desc } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get(accessTokenConfig.name)?.value;
    if (!accessToken) {
      throw new HttpError(401, "Missing access token");
    }

    const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
    const { userId } = await verifyAccessJWT(accessToken, secret);

    const userBooks = await db
      .select()
      .from(books)
      .where(eq(books.userId, userId))
      .orderBy(desc(books.createdAt));

    return NextResponse.json({ ok: true, books: userBooks });
  } catch (error) {
    console.error("[books/get] error:", error);

    const httpError = error instanceof HttpError ? error : null;

    if (httpError) {
      return NextResponse.json(
        { ok: false, error: httpError.publicMessage },
        { status: httpError.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
