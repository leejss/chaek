import { resumeBook } from "@/lib/ai/streaming/bookResumer";
import { ResumeConfig } from "@/lib/ai/types/streaming";
import { authenticate } from "@/lib/auth";
import { HttpError } from "@/lib/errors";
import { readJson, normalizeToHttpError } from "@/utils";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const resumeRequestSchema = z.object({
  startFromChapter: z.number().int().min(1),
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

    const parsed = resumeRequestSchema.safeParse(jsonResult.data);
    if (!parsed.success) throw new HttpError(400, "Invalid request body");

    const body = parsed.data;

    const config: ResumeConfig = {
      bookId,
      userId,
      startFromChapter: body.startFromChapter,
    };

    return resumeBook(config);
  } catch (error) {
    console.error("[books/[id]/resume] error:", error);

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
