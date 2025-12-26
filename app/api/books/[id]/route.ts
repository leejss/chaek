import { db } from "@/db";
import { books } from "@/db/schema";
import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { serverEnv } from "@/lib/env";
import { eq, and } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const accessToken = req.cookies.get(accessTokenConfig.name)?.value;
    if (!accessToken) {
      throw new HttpError(401, "Missing access token");
    }

    const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
    const { userId } = await verifyAccessJWT(accessToken, secret);

    const { id: bookId } = await params;

    const foundBooks = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (foundBooks.length === 0) {
      throw new HttpError(404, "Book not found");
    }

    return NextResponse.json({ ok: true, book: foundBooks[0] });
  } catch (error) {
    console.error("[books/[id]/get] error:", error);

    const httpError =
      error instanceof HttpError ? error : null;

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
