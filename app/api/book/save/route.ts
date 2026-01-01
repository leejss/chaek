import { db } from "@/db";
import { books } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;
    const body = jsonResult.data as {
      bookId?: string;
      title?: unknown;
      tableOfContents?: unknown;
      sourceText?: unknown;
    };

    const title =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim()
        : "Untitled Book";

    const toc =
      Array.isArray(body.tableOfContents) &&
      body.tableOfContents.every((t) => typeof t === "string")
        ? (body.tableOfContents as string[])
        : [];

    const sourceText =
      typeof body.sourceText === "string" ? body.sourceText : null;

    const bookId =
      typeof body.bookId === "string" && body.bookId.trim().length > 0
        ? body.bookId.trim()
        : crypto.randomUUID();

    await db
      .insert(books)
      .values({
        id: bookId,
        userId,
        title,
        content: "",
        tableOfContents: toc,
        sourceText: sourceText ?? undefined,
        status: "draft",
      })
      .onConflictDoUpdate({
        target: books.id,
        set: {
          title,
          tableOfContents: toc,
          sourceText: sourceText ?? undefined,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true, bookId }, { status: 200 });
  } catch (error) {
    console.error("[book/save] error:", error);

    const httpError =
      error instanceof InvalidJsonError
        ? new HttpError(400, "Invalid JSON")
        : error instanceof HttpError
        ? error
        : null;

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
