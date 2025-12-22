import { streamBookChapterGeneration as streamGeminiChapter } from "@/lib/ai/gemini";
import { streamBookChapterGeneration as streamClaudeChapter } from "@/lib/ai/claude";
import { AIProvider, ClaudeModel, GeminiModel } from "@/lib/book/types";
import { readJson } from "@/utils";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { getProviderByModel, isValidModel } from "@/lib/ai/config";
import { z } from "zod";
import { NextResponse } from "next/server";

const chapterRequestSchema = z
  .object({
    toc: z.array(z.string().min(1, "Must be a non-empty string")).min(1),
    chapterTitle: z.string().min(1, "Must be a non-empty string"),
    chapterNumber: z.number().int().min(1),
    sourceText: z.string().min(1, "Must be a non-empty string"),
    provider: z.enum([AIProvider.GOOGLE, AIProvider.ANTHROPIC]),
    model: z
      .string()
      .min(1, "Must be a non-empty string")
      .refine(isValidModel, {
        message: "Unknown model",
      }),
    language: z.string().default("Korean"),
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
  const result = chapterRequestSchema.safeParse(body);

  if (!result.success) {
    throw new HttpError(400, "Invalid request body");
  }

  return result.data;
}

function normalizeToHttpError(error: unknown): HttpError | null {
  if (error == null) {
    return new HttpError(500, "Internal server error");
  }
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
      toc,
      chapterTitle,
      chapterNumber,
      provider,
      model,
      language,
      userPreference,
    } = parseAndValidateBody(jsonResult.data);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let generator;
          const activeProvider = provider;

          if (activeProvider === AIProvider.ANTHROPIC) {
            generator = streamClaudeChapter({
              toc,
              chapterTitle,
              chapterNumber,
              model: model as ClaudeModel,
              language,
              userPreference,
            });
          } else {
            generator = streamGeminiChapter({
              toc,
              chapterTitle,
              chapterNumber,
              model: model as GeminiModel,
              language,
              userPreference,
            });
          }

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          const safeError = error ?? new Error("Unknown stream error");
          console.error("Chapter generation stream error:", safeError);
          controller.error(safeError);
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
    const safeError = error ?? new Error("Unknown error");
    console.error("Chapter generation API error:", safeError);

    const httpError = normalizeToHttpError(safeError);
    if (httpError) return httpErrorToResponse(httpError);

    return NextResponse.json(
      {
        error:
          safeError instanceof Error
            ? safeError.message
            : "Internal server error",
        ok: false,
      },
      { status: 500 },
    );
  }
}
