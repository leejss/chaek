import { AuthenticationRequiredError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import { ContentProjectNotFoundError } from "@/lib/content/errors";
import { getContentProjectSummary } from "@/lib/content/services/projects";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const result = await getContentProjectSummary(user.id, projectId);

    return Response.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return Response.json(
        { error: "authentication_required" },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    }

    if (error instanceof ContentProjectNotFoundError) {
      return Response.json(
        { error: "content_project_not_found" },
        { status: 404, headers: { "cache-control": "no-store" } },
      );
    }

    console.error("[api/content-projects/:projectId] Project lookup failed.", {
      error: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "content_project_lookup_failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
