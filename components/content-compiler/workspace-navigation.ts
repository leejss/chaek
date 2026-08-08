export function createWorkspacePath({
  buildId,
  nodeId,
  projectId,
}: {
  buildId?: string | null;
  nodeId?: string | null;
  projectId: string;
}) {
  const query = new URLSearchParams({ projectId });

  if (buildId) {
    query.set("buildId", buildId);
  }

  if (nodeId) {
    query.set("nodeId", nodeId);
  }

  return `/content?${query.toString()}`;
}
