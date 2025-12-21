import { generateOutline } from "@/lib/ai/pipeline";
import { AIProvider, ClaudeModel, GeminiModel } from "@/lib/book/types";
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
    provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
    model: z.string().min(1).refine(isValidModel, { message: "Unknown model" }),
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

    const { toc, chapterNumber, sourceText, provider, model } =
      parseAndValidateBody(jsonResult.data);

    const outline = await generateOutline(
      {
        provider,
        model: model as GeminiModel | ClaudeModel,
        toc,
        sourceText,
      },
      chapterNumber,
    );

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
