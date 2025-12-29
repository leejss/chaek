import { InvalidJsonError } from "@/lib/errors";

export function generateRandomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function sha256Hex(input: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(input);
  return hasher.digest("hex");
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
