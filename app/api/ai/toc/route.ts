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

    const { sourceText, provider, model } = parseAndValidateBody(
      jsonResult.data,
    );

    if (provider === AIProvider.ANTHROPIC) {
      const toc = await generateClaudeTOC(sourceText, model as ClaudeModel);
      return NextResponse.json({ toc });
    }
    if (provider === AIProvider.GOOGLE) {
      const toc = await generateGeminiTOC(sourceText);
      return NextResponse.json({ toc });
    }

    throw new HttpError(400, "Invalid provider");
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
