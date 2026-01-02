import { z } from "zod";
import { AIProvider } from "@/lib/book/types";
import {
  readJson,
  normalizeToHttpError,
  httpErrorToResponse,
  parseAndValidateBody,
} from "@/utils";
import { NextResponse } from "next/server";
import { isValidModel, getProviderByModel } from "@/lib/ai/config";
import { generatePlan } from "@/lib/ai/core/ai";

const planRequestSchema = z
  .object({
    sourceText: z.string().min(1, "Must be a non-empty string"),
    toc: z.array(z.string().min(1, "Must be a non-empty string")).min(1),
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

// POST /api/ai/plan
export async function POST(req: Request) {
  try {
    const jsonResult = await readJson(req);
    if (!jsonResult.ok) throw jsonResult.error;

    const { sourceText, toc, provider, model, language } = parseAndValidateBody(
      jsonResult.data,
      planRequestSchema,
    );

    const plan = await generatePlan({
      sourceText,
      toc,
      provider,
      model,
      language,
    });

    return NextResponse.json({ data: { plan } });
  } catch (error) {
    console.error("Plan generation API error:", error);
    const httpError = normalizeToHttpError(error);
    if (httpError) return httpErrorToResponse(httpError);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
