import { db } from "@/db";
import { books } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { eq, desc } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

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
