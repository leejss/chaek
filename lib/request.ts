import { HttpError } from "@/lib/errors";

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch (error) {
    // Server log only: keep client response generic.
    console.error("[HttpError] Invalid JSON body:", error);
    throw new HttpError(400, "Invalid JSON");
  }
}


