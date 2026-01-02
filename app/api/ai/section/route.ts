import { ai, streamSection } from "@/lib/ai/core/ai";
import { AIProvider, Section } from "@/lib/book/types";
import { getProviderByModel, isValidModel } from "@/lib/ai/config";
import { readJson, normalizeToHttpError, parseAndValidateBody } from "@/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const sectionSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().optional(),
});

const sectionRequestSchema = z
  .object({
    chapterNumber: z.number().int().min(1),
    chapterTitle: z.string().min(1),
    chapterOutline: z.array(sectionSchema).min(1),
    sectionIndex: z.number().int().min(0),
    previousSections: z.array(sectionSchema),
    toc: z.array(z.string().min(1)).min(1),
    sourceText: z.string().min(1),
    bookPlan: z.any().optional(), // Add plan
    provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
    model: z.string().min(1).refine(isValidModel, { message: "Unknown model" }),
    language: z.string().default("Korean"),
    userPreference: z.string().optional(),
  })
  .refine((data) => getProviderByModel(data.model) === data.provider, {
    message: "Provider does not match model",
    path: ["provider"],
  })
  .refine((data) => data.sectionIndex < data.chapterOutline.length, {
    message: "Section index out of bounds",
    path: ["sectionIndex"],
  });

export async function POST(req: Request) {
  try {
    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;

    const {
      chapterNumber,
      chapterTitle,
      chapterOutline,
      sectionIndex,
      previousSections,
      bookPlan,
      provider,
      model,
      language,
      userPreference,
    } = parseAndValidateBody(jsonResult.data, sectionRequestSchema);

    const result = await streamSection({
      chapterNumber,
      chapterTitle,
      chapterOutline: chapterOutline as Section[],
      sectionIndex,
      previousSections: previousSections as Section[],
      bookPlan,
      settings: {
        provider,
        model,
        language,
        userPreference,
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Section generation API error:", error);

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
