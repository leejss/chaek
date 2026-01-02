import { db } from "@/db";
import { books, creditTransactions } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { readJson, normalizeToHttpError } from "@/utils";
import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BOOK_CREATION_COST } from "@/lib/credits/config";
import {
  deductCredits,
  getUserBalance,
} from "@/lib/credits/operations";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authenticate(req);
    const { id: bookId } = await params;

    const existing = await db
      .select()
      .from(books)
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Book not found" },
        { status: 404 },
      );
    }

    const status = existing[0].status;
    if (status === "completed") {
      return NextResponse.json(
        { ok: false, error: "Book already completed" },
        { status: 409 },
      );
    }

    const existingUsage = await db
      .select({ id: creditTransactions.id })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.type, "usage"),
          eq(creditTransactions.bookId, bookId),
        ),
      )
      .limit(1);

    if (existingUsage.length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const balance = await getUserBalance(userId);
    if (balance.balance < BOOK_CREATION_COST) {
      throw new HttpError(402, "Insufficient credits");
    }

    await deductCredits({
      userId,
      amount: BOOK_CREATION_COST,
      bookId,
      metadata: {
        reason: "sync_book_generation",
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[books/[id]/deduct-credits] error:", error);

    const httpError = normalizeToHttpError(error);
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
