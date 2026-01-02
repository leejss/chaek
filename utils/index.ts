import { z } from "zod";
import { HttpError, InvalidJsonError } from "@/lib/errors";
import { NextResponse } from "next/server";

export function generateRandomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type ReadJsonResult =
  | { ok: true; data: unknown }
  | { ok: false; error: InvalidJsonError };

export async function readJson(req: Request): Promise<ReadJsonResult> {
  try {
    const data = await req.json();
    return { ok: true, data };
  } catch (error) {
    console.error("[InvalidJsonError] Invalid JSON body:", error);
    return { ok: false, error: new InvalidJsonError() };
  }
}

export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

export function parseAndValidateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    console.error(
      "[InvalidRequestBodyError] Invalid request body:",
      result.error,
    );
    throw new HttpError(400, "Invalid request body");
  }
  return result.data;
}

export function normalizeToHttpError(error: unknown): HttpError | null {
  if (error instanceof InvalidJsonError) {
    return new HttpError(400, "Invalid JSON");
  }
  if (error instanceof HttpError) {
    return error;
  }
  return null;
}

export function httpErrorToResponse(httpError: HttpError) {
  return NextResponse.json(
    {
      error: httpError.publicMessage,
      ok: false,
    },
    { status: httpError.status },
  );
}
