import type { Metadata } from "next";
import { parseWorkspacePanelLayout } from "@/components/content-compiler/workspace-navigation";
import { ContentCompilerView } from "@/components/content-compiler-view";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "콘텐츠 | Chaek",
  description: "주제를 입력하고 콘텐츠 구조가 완성되는 과정을 확인합니다.",
};

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{
    buildId?: string;
    nodeId?: string;
    panels?: string;
    projectId?: string;
    topic?: string;
  }>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getCurrentSession(),
  ]);
  const contentSearchParams = new URLSearchParams();

  if (params.buildId) {
    contentSearchParams.set("buildId", params.buildId);
  }

  if (params.nodeId) {
    contentSearchParams.set("nodeId", params.nodeId);
  }

  if (params.panels) {
    contentSearchParams.set("panels", params.panels);
  }

  if (params.projectId) {
    contentSearchParams.set("projectId", params.projectId);
  }

  if (params.topic) {
    contentSearchParams.set("topic", params.topic);
  }

  const signInReturnTo = contentSearchParams.size
    ? `/content?${contentSearchParams.toString()}`
    : "/content";

  return (
    <ContentCompilerView
      initialBuildId={session ? (params.buildId ?? null) : null}
      initialNodeId={session ? (params.nodeId ?? null) : null}
      initialPanelLayout={parseWorkspacePanelLayout(params.panels)}
      initialProjectId={session ? (params.projectId ?? null) : null}
      initialSeedInput={params.topic?.trim() || undefined}
      isAuthenticated={Boolean(session)}
      key={`${params.projectId ?? "new"}:${params.buildId ?? "none"}`}
      signInReturnTo={signInReturnTo}
    />
  );
}
