import { db } from "@/db";
import { books } from "@/db/schema";
import { verifyAccessJWT, accessTokenConfig } from "@/lib/auth";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { serverEnv } from "@/lib/env";
import { readJson } from "@/utils";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get(accessTokenConfig.name)?.value;
    if (!accessToken) {
      throw new HttpError(401, "Missing access token");
    }

    const secret = new TextEncoder().encode(serverEnv.OUR_JWT_SECRET);
    const { userId } = await verifyAccessJWT(accessToken, secret);

    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;
    const body = jsonResult.data as {
      title?: unknown;
      content?: unknown;
      tableOfContents?: unknown;
      sourceText?: unknown;
    };

    if (typeof body.content !== "string" || body.content.trim().length === 0) {
      throw new HttpError(400, "Missing content");
    }

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

    const [inserted] = await db
      .insert(books)
      .values({
        userId,
        title,
        content: body.content,
        tableOfContents: toc,
        sourceText: sourceText ?? undefined,
      })
      .returning({ id: books.id });

    if (!inserted) {
      throw new Error("Failed to insert book");
    }

    return NextResponse.json(
      { ok: true, bookId: inserted.id },
      { status: 200 },
    );
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
