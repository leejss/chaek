import { z } from "zod";
import { generateTableOfContents as generateClaudeTOC } from "@/lib/ai/claude";
import { generateTableOfContents as generateGeminiTOC } from "@/lib/ai/gemini";
import { getProviderByModel, isValidModel } from "@/lib/ai/config";
import { AIProvider, ClaudeModel } from "@/lib/book/types";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
import { NextResponse } from "next/server";

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

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const { sourceText, provider, model } = parseAndValidateBody(body);

    console.log("TOC generation API request:", { sourceText, provider, model });

    let toc: string[];

    if (provider === AIProvider.ANTHROPIC) {
      toc = await generateClaudeTOC(sourceText, model as ClaudeModel);
    } else {
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
      const details = (httpError as unknown as { details?: unknown }).details;
      return NextResponse.json(
        {
          error: httpError.publicMessage,
          ok: false,
          ...(details ? { details } : {}),
        },
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
