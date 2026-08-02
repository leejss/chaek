import { AuthenticationRequiredError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import {
  ContentChapterNotFoundError,
  InvalidChapterContextError,
} from "@/lib/content/errors";
import { getContentChapter } from "@/lib/content/services/chapter-context";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; nodeId: string }> },
) {
  try {
    const user = await requireUser();
    const { projectId, nodeId } = await context.params;
    const chapter = await getContentChapter(user.id, projectId, nodeId);

    return Response.json(chapter, {
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

    if (error instanceof InvalidChapterContextError) {
      return Response.json(
        { error: "invalid_chapter_context" },
        { status: 409, headers: { "cache-control": "no-store" } },
      );
    }

    console.error(
      "[api/content-projects/:projectId/nodes/:nodeId] Chapter lookup failed.",
      {
        error: error instanceof Error ? error.name : "UnknownError",
      },
    );

    return Response.json(
      { error: "content_chapter_lookup_failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
