import { generateChapterOutline } from "@/lib/ai/core/ai";
import { AIProvider } from "@/lib/book/types";
import { getProviderByModel, isValidModel } from "@/lib/ai/config";
import { readJson, normalizeToHttpError, parseAndValidateBody } from "@/utils";
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
    } = parseAndValidateBody(jsonResult.data, outlineRequestSchema);

    const chapterTitle = toc[chapterNumber - 1];
    if (!chapterTitle) throw new Error("Chapter title not found in TOC");

    const outline = await generateChapterOutline({
      toc,
      chapterTitle,
      chapterNumber,
      sourceText,
      plan: bookPlan,
      provider,
      model,
      language,
      userPreference,
    });

    return NextResponse.json({ data: { outline } });
  } catch (error) {
    console.error("Outline generation API error:", error);

    const httpError = normalizeToHttpError(error);
    if (httpError) {
      return NextResponse.json(
        { error: httpError.publicMessage },
        { status: httpError.status },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
