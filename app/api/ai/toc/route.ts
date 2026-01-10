import { getProviderByModel, isValidModel, AIProvider } from "@/lib/ai/config";
import { generateTableOfContent } from "@/lib/ai/api";
import {
  httpErrorToResponse,
  normalizeToHttpError,
  parseAndValidateBody,
  readJson,
} from "@/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z
  .object({
    sourceText: z.string().min(1, "Must be a non-empty string"),
    provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
    model: z
      .string()
      .min(1, "Must be a non-empty string")
      .refine(isValidModel, {
        message: "Unknown model",
      }),
    language: z
      .enum(["Korean", "English", "Japanese", "Chinese", "Auto"])
      .default("Korean"),
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
    } = parseAndValidateBody(jsonResult.data, requestSchema);

    const { title, chapters } = await generateTableOfContent({
      sourceText,
      provider,
      model,
      language,
      chapterCount,
      userPreference,
    });
    return NextResponse.json({ data: { title, chapters } });
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
