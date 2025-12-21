import { streamSection } from "@/lib/ai/pipeline";
import {
  AIProvider,
  ClaudeModel,
  GeminiModel,
  Section,
} from "@/lib/book/types";
import { getProviderByModel, isValidModel } from "@/lib/ai/config";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
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
    provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
    model: z.string().min(1).refine(isValidModel, { message: "Unknown model" }),
  })
  .refine((data) => getProviderByModel(data.model) === data.provider, {
    message: "Provider does not match model",
    path: ["provider"],
  })
  .refine((data) => data.sectionIndex < data.chapterOutline.length, {
    message: "Section index out of bounds",
    path: ["sectionIndex"],
  });

function parseAndValidateBody(body: unknown) {
  const result = sectionRequestSchema.safeParse(body);
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
      chapterNumber,
      chapterTitle,
      chapterOutline,
      sectionIndex,
      previousSections,
      toc,
      sourceText,
      provider,
      model,
    } = parseAndValidateBody(jsonResult.data);

    const outline = {
      chapterNumber,
      chapterTitle,
      sections: chapterOutline as Section[],
    };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamSection(
            {
              provider,
              model: model as GeminiModel | ClaudeModel,
              toc,
              sourceText,
            },
            outline,
            sectionIndex,
            previousSections as Section[],
          );

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          console.error("Section generation stream error:", error);
          controller.error(error ?? new Error("Unknown stream error"));
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
