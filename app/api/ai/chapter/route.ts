import { streamBookChapterGeneration as streamGeminiChapter } from "@/lib/ai/gemini";
import { streamBookChapterGeneration as streamClaudeChapter } from "@/lib/ai/claude";
import { AIProvider, ClaudeModel, GeminiModel } from "@/lib/book/types";
import { readJson } from "@/utils";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { getProviderByModel } from "@/lib/ai/config";

export async function POST(req: Request) {
  try {
    const params = await readJson(req);
    const { toc, chapterTitle, chapterNumber, sourceText, provider, model } =
      params as {
        toc: string[];
        chapterTitle: string;
        chapterNumber: number;
        sourceText: string;
        provider: AIProvider;
        model: GeminiModel | ClaudeModel;
      };

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let generator;
          const activeProvider =
            provider || (model ? getProviderByModel(model) : undefined);

          if (activeProvider === AIProvider.ANTHROPIC) {
            generator = streamClaudeChapter({
              toc,
              chapterTitle,
              chapterNumber,
              sourceText,
              model: model as ClaudeModel,
            });
          } else {
            generator = streamGeminiChapter({
              toc,
              chapterTitle,
              chapterNumber,
              sourceText,
              model: model as GeminiModel,
            });
          }

          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
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
    console.error("Chapter generation API error:", error);

    const httpError =
      error instanceof InvalidJsonError
        ? new HttpError(400, "Invalid JSON")
        : error instanceof HttpError
        ? error
        : null;

    if (httpError) {
      return new Response(
        JSON.stringify({ error: httpError.publicMessage, ok: false }),
        {
          status: httpError.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        ok: false,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
