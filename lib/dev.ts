import fs from "fs/promises";
import path from "path";

const DEBUG_ROOT = path.join(process.cwd(), ".debug");

/**
 * Append debug text or binary data to a file under the .debug directory.
 * The relativePath can include nested folders (e.g. "claude/chapter-1.txt").
 * Creates parent directories as needed. Intended for server-side debugging only.
 */
export async function appendDebugFile(
  relativePath: string,
  content: string | Buffer,
): Promise<void> {
  // Avoid accidental use in the browser bundle.
  if (typeof window !== "undefined") return;

  const filePath = path.join(DEBUG_ROOT, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const data = typeof content === "string" ? content : content;
  await fs.appendFile(filePath, data);
}
