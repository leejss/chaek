import { reconcileStaleAiWork } from "@/lib/ai/gemini";
import { isAuthorizedReconciliationRequest } from "@/lib/ai/internal-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isAuthorizedReconciliationRequest(request)) {
      return Response.json(
        { error: "unauthorized" },
        { status: 401, headers: { "cache-control": "no-store" } },
      );
    }

    const result = await reconcileStaleAiWork();

    return Response.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("[api/internal/ai/reconcile] Reconciliation failed.", {
      error: error instanceof Error ? error.name : "UnknownError",
    });

    return Response.json(
      { error: "reconciliation_failed" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
