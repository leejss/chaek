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

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch (error) {
    console.error("[InvalidJsonError] Invalid JSON body:", error);
    throw new InvalidJsonError();
  }
}
