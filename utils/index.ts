import { type ClassValue, clsx } from "clsx";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { NextResponse } from "next/server";
import { twMerge } from "tailwind-merge";
import type { z } from "zod";
import { HttpError, InvalidJsonError } from "@/lib/errors";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

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
		.replace(/[^\w-]+/g, "")
		.replace(/--+/g, "-");
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

type DateInput = Date | number | string;

interface FormatDateOptions {
	formatStr?: string;
	relative?: boolean;
	addSuffix?: boolean;
}

export function formatDate(
	date: DateInput,
	{
		formatStr = "PPP",
		relative = false,
		addSuffix = true,
	}: FormatDateOptions = {},
): string {
	const parsed = typeof date === "string" ? new Date(date) : date;

	if (relative) {
		return formatDistanceToNow(parsed, { locale: ko, addSuffix });
	}

	return format(parsed, formatStr, { locale: ko });
}
