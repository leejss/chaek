import { orchestrator } from "@/lib/ai/core/orchestrator";
import { AIProvider } from "@/lib/book/types";
import { getProviderByModel, isValidModel } from "@/lib/ai/config";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const outlineRequestSchema = z
  .object({
    toc: z.array(z.string().min(1)).min(1),
    chapterNumber: z.number().int().min(1),
    sourceText: z.string().min(1),
    bookPlan: z.any().optional(), // Add plan to context
    provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
    model: z.string().min(1).refine(isValidModel, { message: "Unknown model" }),
    language: z.string().default("Korean"),
    userPreference: z.string().optional(),
  })
  .refine((data) => getProviderByModel(data.model) === data.provider, {
    message: "Provider does not match model",
    path: ["provider"],
  });

function parseAndValidateBody(body: unknown) {
  const result = outlineRequestSchema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, "Invalid request body");
  }
  return result.data;
}

function normalizeToHttpError(error: unknown): HttpError | null {
  if (error == null) return new HttpError(500, "Internal server error");
  if (error instanceof InvalidJsonError)
    return new HttpError(400, "Invalid JSON");
  if (error instanceof HttpError) return error;
  return null;
}

export async function POST(req: Request) {
  try {
    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;

    const {
      toc,
      chapterNumber,
      sourceText,
      bookPlan,
      provider,
      model,
      language,
      userPreference,
    } = parseAndValidateBody(jsonResult.data);

    // Need chapterTitle. Existing code didn't extract it from TOC?
    // Wait, existing code passed `toc` and `chapterNumber` to `generateOutline`.
    // `generateOutline` inside pipeline.ts logic: "const chapterTitle = toc[chapterNumber - 1];"
    // So I need to do that here.
    const chapterTitle = toc[chapterNumber - 1];
    if (!chapterTitle) throw new Error("Chapter title not found in TOC");

    const outline = await orchestrator.generateChapterOutline({
      toc,
      chapterTitle,
      chapterNumber,
      sourceText,
      bookPlan,
      settings: {
        provider,
        model,
        language,
        userPreference,
      },
    });

    return NextResponse.json({ ok: true, outline });
  } catch (error) {
    console.error("Outline generation API error:", error);

    const httpError = normalizeToHttpError(error);
    if (httpError) {
      return NextResponse.json(
        { error: httpError.publicMessage, ok: false },
        { status: httpError.status },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        ok: false,
      },
      { status: 500 },
    );
  }
}
