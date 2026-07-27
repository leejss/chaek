import { assertTrustedOrigin } from "@/lib/auth/config";
import { AuthenticationRequiredError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import { startContentProject } from "@/lib/content/build";
import {
  createContentProjectRequestSchema,
  idempotencyKeySchema,
} from "@/lib/content/contracts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertTrustedOrigin(request);
  } catch {
    return Response.json(
      { error: "invalid_origin" },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const user = await requireUser();
    const idempotencyKey = idempotencyKeySchema.safeParse(
      request.headers.get("idempotency-key"),
    );
    const body = await request
      .json()
      .then((value) => createContentProjectRequestSchema.safeParse(value))
      .catch(() => null);

    if (!idempotencyKey.success) {
      return Response.json(
        { error: "invalid_idempotency_key" },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    if (!body?.success) {
      return Response.json(
        { error: "invalid_request" },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    const project = await startContentProject(
      user.id,
      body.data.seedInput,
      idempotencyKey.data,
    );

    return Response.json(project, {
      status: 202,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        { error: "authentication_required" },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    }

    console.error("[api/content-projects] Project creation failed.", {
      error: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "content_project_creation_failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
