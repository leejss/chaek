import { streamBook } from "@/lib/ai/streaming/streamGenerator";
import { StreamingConfig } from "@/lib/ai/types/streaming";
import { AIProvider } from "@/lib/ai/config";
import { authenticate } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { readJson, normalizeToHttpError } from "@/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const streamRequestSchema = z.object({
  title: z.string().min(1),
  tableOfContents: z.array(z.string().min(1)).min(1),
  sourceText: z.string().min(1),
  provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
  model: z.string().min(1),
  language: z
    .enum(["Korean", "English", "Japanese", "Chinese", "Auto"])
    .default("Korean"),
  userPreference: z.string().default(""),
  startFromChapter: z.number().int().min(1).optional(),
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

    const parsed = streamRequestSchema.safeParse(jsonResult.data);
    if (!parsed.success) throw new HttpError(400, "Invalid request body");

    const body = parsed.data;

    const config: StreamingConfig = {
      bookId,
      userId,
      title: body.title,
      tableOfContents: body.tableOfContents,
      sourceText: body.sourceText,
      provider: body.provider,
      model: body.model,
      language: body.language,
      userPreference: body.userPreference,
      startFromChapter: body.startFromChapter,
    };

    return streamBook(config);
  } catch (error) {
    console.error("[books/[id]/stream] error:", error);

    const httpError = normalizeToHttpError(error);
    if (httpError) {
      return new NextResponse(
        JSON.stringify({ ok: false, error: httpError.publicMessage }),
        { status: httpError.status },
      );
    }

    return new NextResponse(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 },
    );
  }
}
