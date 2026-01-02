import { db } from "@/db";
import { books } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import {
  readJson,
  parseAndValidateBody,
  normalizeToHttpError,
  httpErrorToResponse,
} from "@/utils";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  title: z.string().min(1),
  tableOfContents: z.array(z.string()).optional().default([]),
  sourceText: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;

    const { title, tableOfContents, sourceText } = parseAndValidateBody(
      jsonResult.data,
      requestSchema,
    );

    const result = await db
      .insert(books)
      .values({
        userId,
        title,
        content: "",
        tableOfContents,
        sourceText: sourceText ?? undefined,
        status: "draft",
      })
      .onConflictDoUpdate({
        target: books.id,
        set: {
          title,
          tableOfContents,
          sourceText: sourceText ?? undefined,
          updatedAt: new Date(),
        },
      })
      .returning({ id: books.id });

    return NextResponse.json(
      { data: { bookId: result[0].id } },
      { status: 200 },
    );
  } catch (error) {
    console.error("[book/save] error:", error);
    const httpError = normalizeToHttpError(error);
    if (httpError) return httpErrorToResponse(httpError);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
