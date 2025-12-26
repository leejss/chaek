import { z } from "zod";
import { orchestrator } from "@/lib/ai/core/orchestrator";
import { AIProvider, GeminiModel, ClaudeModel } from "@/lib/book/types";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
import { NextResponse } from "next/server";
import { isValidModel, getProviderByModel } from "@/lib/ai/config";
import { Language } from "@/lib/book/settings";
import { TocSchema } from "@/lib/ai/specs/toc";

const tocRequestSchema = z
  .object({
    sourceText: z.string().min(1, "Must be a non-empty string"),
    provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
    model: z
      .string()
      .min(1, "Must be a non-empty string")
      .refine(isValidModel, {
        message: "Unknown model",
      }),
    language: z.string().default("Korean"),
    chapterCount: z
      .union([z.number().int().min(3).max(10), z.literal("Auto")])
      .default("Auto"),
    userPreference: z.string().optional(),
  })
  .refine(
    (data) => {
      const expectedProvider = getProviderByModel(data.model);
      return expectedProvider === data.provider;
    },
    {
      message: "Provider does not match model",
      path: ["provider"],
    },
  );

function parseAndValidateBody(body: unknown) {
  const result = tocRequestSchema.safeParse(body);

  if (!result.success) {
    throw new HttpError(400, "Invalid request body");
  }

  return result.data;
}

function normalizeToHttpError(error: unknown): HttpError | null {
  if (error instanceof InvalidJsonError) {
    return new HttpError(400, "Invalid JSON");
  }
  if (error instanceof HttpError) {
    return error;
  }
  return null;
}

function httpErrorToResponse(httpError: HttpError) {
  return NextResponse.json(
    {
      error: httpError.publicMessage,
      ok: false,
    },
    { status: httpError.status },
  );
}

export async function POST(req: Request) {
  try {
    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;

    const {
      sourceText,
      provider,
      model,
      language,
      chapterCount,
      userPreference,
    } = parseAndValidateBody(jsonResult.data);

    const toc = await orchestrator.generateTOC(sourceText, {
      provider,
      model: model as GeminiModel | ClaudeModel,
      language: language as Language,
      chapterCount,
      userPreference,
    });

    return NextResponse.json({ title: toc.title, toc: toc.chapters });
  } catch (error) {
    console.error("TOC generation API error:", error);

    const httpError = normalizeToHttpError(error);
    if (httpError) return httpErrorToResponse(httpError);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        ok: false,
      },
      { status: 500 },
    );
  }
}
