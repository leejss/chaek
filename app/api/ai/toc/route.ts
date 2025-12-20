import { NextResponse } from "next/server";
import { generateTableOfContents as generateGeminiTOC } from "@/lib/ai/gemini";
import { generateTableOfContents as generateClaudeTOC } from "@/lib/ai/claude";
import { AIProvider } from "@/lib/book/types";
import { readJson } from "@/utils";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { getProviderByModel } from "@/lib/ai/config";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { sourceText, provider, model } = body as {
      sourceText: string;
      provider: AIProvider;
      model: string;
    };

    if (!sourceText) {
      throw new HttpError(400, "sourceText is required");
    }

    let toc: string[];
    const activeProvider =
      provider || (model ? getProviderByModel(model) : undefined);

    if (activeProvider === AIProvider.ANTHROPIC) {
      toc = await generateClaudeTOC(sourceText);
    } else {
      // 기본값은 Google Gemini
      toc = await generateGeminiTOC(sourceText);
    }

    return NextResponse.json({ toc });
  } catch (error) {
    console.error("TOC generation API error:", error);

    const httpError =
      error instanceof InvalidJsonError
        ? new HttpError(400, "Invalid JSON")
        : error instanceof HttpError
        ? error
        : null;

    if (httpError) {
      return NextResponse.json(
        { error: httpError.publicMessage, ok: false },
        { status: httpError.status },
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate TOC",
        ok: false,
      },
      { status: 500 },
    );
  }
}
