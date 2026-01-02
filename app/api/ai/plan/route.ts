import { z } from "zod";
import { ai } from "@/lib/ai/core/ai";
import { AIProvider } from "@/lib/book/types";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { readJson } from "@/utils";
import { NextResponse } from "next/server";
import { isValidModel, getProviderByModel } from "@/lib/ai/config";

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
  const result = planRequestSchema.safeParse(body);
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

    const { sourceText, toc, provider, model, language, userPreference } =
      parseAndValidateBody(jsonResult.data);

    const plan = await ai.generatePlan(sourceText, toc, {
      provider,
      model,
      language,
      userPreference,
    });

    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    console.error("Plan generation API error:", error);
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
