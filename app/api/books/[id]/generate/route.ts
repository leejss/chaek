import { db } from "@/db";
import { bookGenerationStates, books, creditTransactions } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { enqueueGenerateBookJob } from "@/lib/ai/worker/bookGenerationQueue";
import { HttpError } from "@/lib/errors";
import { readJson, normalizeToHttpError } from "@/utils";
import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { BOOK_CREATION_COST } from "@/lib/credits/config";
import {
  deductCredits,
  getUserBalance,
  refundUsageCredits,
} from "@/lib/credits/operations";

const requestSchema = z.object({
  title: z.string().min(1),
  tableOfContents: z.array(z.string().min(1)).min(1),
  sourceText: z.string().min(1),
  provider: z.enum(["google", "anthropic"]),
  model: z.string().min(1),
  language: z
    .enum(["Korean", "English", "Japanese", "Chinese", "Auto"])
    .default("Korean"),
  userPreference: z.string().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await authenticate(req);
    const { id: bookId } = await params;
    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;
    const parsed = requestSchema.safeParse(jsonResult.data);
    if (!parsed.success) throw new HttpError(400, "Invalid request body");

    const body = parsed.data;

    const nextGenerationSettings = {
      provider: body.provider,
      model: body.model,
      language: body.language,
      chapterCount: "Auto" as const,
      userPreference: body.userPreference,
    };

    let createdNewBook = false;
    let didDeductCredits = false;

    const existing = await db
      .select({ book: books, state: bookGenerationStates })
      .from(books)
      .leftJoin(bookGenerationStates, eq(bookGenerationStates.bookId, books.id))
      .where(and(eq(books.id, bookId), eq(books.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      createdNewBook = true;
      await db.transaction(async (tx) => {
        await tx.insert(books).values({
          id: bookId,
          userId,
          title: body.title,
          content: "",
          tableOfContents: body.tableOfContents,
          sourceText: body.sourceText,
          updatedAt: new Date(),
        });

        await tx.insert(bookGenerationStates).values({
          bookId,
          status: "waiting",
          generationSettings: nextGenerationSettings,
          updatedAt: new Date(),
        });
      });
    } else {
      const row = existing[0];
      const existingBook = row?.book;
      const existingState = row?.state;
      if (!existingBook) {
        throw new HttpError(404, "Book not found");
      }

      const status = existingState?.status ?? "waiting";
      if (status === "completed") {
        return NextResponse.json(
          { ok: false, error: "Book already completed" },
          { status: 409 },
        );
      }

      if (status === "generating") {
        return NextResponse.json({ ok: true }, { status: 202 });
      }

      await db
        .update(books)
        .set({
          title: body.title,
          tableOfContents: body.tableOfContents,
          sourceText: body.sourceText,
          updatedAt: new Date(),
        })
        .where(and(eq(books.id, bookId), eq(books.userId, userId)));

      await db
        .insert(bookGenerationStates)
        .values({
          bookId,
          generationSettings: nextGenerationSettings,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [bookGenerationStates.bookId],
          set: {
            generationSettings: nextGenerationSettings,
            updatedAt: new Date(),
          },
        });
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

    if (existingUsage.length === 0) {
      const balance = await getUserBalance(userId);
      if (balance.balance < BOOK_CREATION_COST) {
        if (createdNewBook) {
          await db
            .delete(books)
            .where(and(eq(books.id, bookId), eq(books.userId, userId)));
        }
        throw new HttpError(402, "Insufficient credits");
      }

      await deductCredits({
        userId,
        amount: BOOK_CREATION_COST,
        bookId,
        metadata: {
          reason: "async_book_generation",
        },
      });
      didDeductCredits = true;
    }

    try {
      await enqueueGenerateBookJob({
        bookId,
        step: "init",
        provider: body.provider,
        model: body.model,
        language: body.language,
        userPreference: body.userPreference,
      });
    } catch (error) {
      console.error("[books/[id]/generate] enqueue error:", error);

      if (didDeductCredits) {
        try {
          await refundUsageCredits({
            userId,
            amount: BOOK_CREATION_COST,
            bookId,
            metadata: {
              reason: "enqueue_failed",
            },
          });
        } catch (refundError) {
          console.error(
            "[books/[id]/generate] refund usage credits error:",
            refundError,
          );

          await db
            .insert(bookGenerationStates)
            .values({
              bookId,
              status: "failed",
              error: "Queue enqueue failed (and credit refund failed)",
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [bookGenerationStates.bookId],
              set: {
                status: "failed",
                error: "Queue enqueue failed (and credit refund failed)",
                updatedAt: new Date(),
              },
            });

          throw new HttpError(503, "Job queue is temporarily unavailable");
        }
      }

      if (createdNewBook) {
        await db
          .delete(books)
          .where(and(eq(books.id, bookId), eq(books.userId, userId)));
      } else {
        await db
          .insert(bookGenerationStates)
          .values({
            bookId,
            status: "failed",
            error: "Queue enqueue failed",
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [bookGenerationStates.bookId],
            set: {
              status: "failed",
              error: "Queue enqueue failed",
              updatedAt: new Date(),
            },
          });

        await db
          .update(books)
          .set({ updatedAt: new Date() })
          .where(and(eq(books.id, bookId), eq(books.userId, userId)));
      }

      throw new HttpError(503, "Job queue is temporarily unavailable");
    }

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    console.error("[books/[id]/generate] error:", error);

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
