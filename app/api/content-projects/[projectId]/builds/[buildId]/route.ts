import { reconcileContentBuild } from "@/lib/ai/gemini";
import { AuthenticationRequiredError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import {
  ContentBuildNotFoundError,
  ContentProjectNotFoundError,
} from "@/lib/content/errors";
import {
  getContentBuildStatus,
  getOwnedContentBuild,
} from "@/lib/content/services/projects";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; buildId: string }> },
) {
  try {
    const user = await requireUser();
    const { projectId, buildId } = await context.params;

    await getOwnedContentBuild(user.id, projectId, buildId);

    try {
      await reconcileContentBuild(buildId);
    } catch (error) {
      console.warn("[content-compiler] Poll reconciliation was deferred.", {
        buildId,
        error: error instanceof Error ? error.name : "UnknownError",
      });
    }

    const status = await getContentBuildStatus(user.id, projectId, buildId);

    return Response.json(status, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        { error: "authentication_required" },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    }

    if (
      error instanceof ContentProjectNotFoundError ||
      error instanceof ContentBuildNotFoundError
    ) {
      return Response.json(
        { error: "content_build_not_found" },
        { status: 404, headers: { "cache-control": "no-store" } },
      );
    }

    console.error(
      "[api/content-projects/:projectId/builds/:buildId] Build lookup failed.",
      {
        error: error instanceof Error ? error.name : "UnknownError",
      },
    );

    return Response.json(
      { error: "content_build_lookup_failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
