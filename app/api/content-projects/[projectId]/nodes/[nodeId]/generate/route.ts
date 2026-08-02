import { assertTrustedOrigin } from "@/lib/auth/config";
import { AuthenticationRequiredError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import { startChapterBuild } from "@/lib/content/build";
import { idempotencyKeySchema } from "@/lib/content/contracts";
import {
  ContentBuildConflictError,
  ContentChapterNotFoundError,
  InvalidChapterContextError,
} from "@/lib/content/errors";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; nodeId: string }> },
) {
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
    const { projectId, nodeId } = await context.params;
    const idempotencyKey = idempotencyKeySchema.safeParse(
      request.headers.get("idempotency-key"),
    );

    if (!idempotencyKey.success) {
      return Response.json(
        { error: "invalid_idempotency_key" },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }

    const build = await startChapterBuild(
      user.id,
      projectId,
      nodeId,
      idempotencyKey.data,
    );

    return Response.json(build, {
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

    if (error instanceof ContentChapterNotFoundError) {
      return Response.json(
        { error: "content_chapter_not_found" },
        { status: 404, headers: { "cache-control": "no-store" } },
      );
    }

    if (
      error instanceof InvalidChapterContextError ||
      error instanceof ContentBuildConflictError
    ) {
      return Response.json(
        { error: "chapter_generation_conflict" },
        { status: 409, headers: { "cache-control": "no-store" } },
      );
    }

    console.error(
      "[api/content-projects/:projectId/nodes/:nodeId/generate] Chapter generation failed.",
      {
        error: error instanceof Error ? error.name : "UnknownError",
      },
    );

    return Response.json(
      { error: "chapter_generation_failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
