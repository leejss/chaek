export type WorkspacePanelLayout =
  | "both"
  | "canvas"
  | "inspector"
  | "structure";

export function parseWorkspacePanelLayout(
  value: string | undefined,
): WorkspacePanelLayout {
  switch (value) {
    case "canvas":
    case "inspector":
    case "structure":
      return value;
    default:
      return "both";
  }
}

export function isInspectorPanelOpen(layout: WorkspacePanelLayout) {
  return layout === "both" || layout === "inspector";
}

export function isStructurePanelOpen(layout: WorkspacePanelLayout) {
  return layout === "both" || layout === "structure";
}

export function toggleWorkspacePanel(
  layout: WorkspacePanelLayout,
  panel: "inspector" | "structure",
): WorkspacePanelLayout {
  const structureOpen = isStructurePanelOpen(layout);
  const inspectorOpen = isInspectorPanelOpen(layout);
  const nextStructureOpen =
    panel === "structure" ? !structureOpen : structureOpen;
  const nextInspectorOpen =
    panel === "inspector" ? !inspectorOpen : inspectorOpen;

  if (nextStructureOpen && nextInspectorOpen) {
    return "both";
  }

  if (nextStructureOpen) {
    return "structure";
  }

  if (nextInspectorOpen) {
    return "inspector";
  }

  return "canvas";
}

export function createWorkspacePath({
  buildId,
  nodeId,
  panels = "both",
  projectId,
}: {
  buildId?: string | null;
  nodeId?: string | null;
  panels?: WorkspacePanelLayout;
  projectId: string;
}) {
  const query = new URLSearchParams({ projectId });

  if (buildId) {
    query.set("buildId", buildId);
  }

  if (nodeId) {
    query.set("nodeId", nodeId);
  }

  if (panels !== "both") {
    query.set("panels", panels);
  }

  return `/content?${query.toString()}`;
}
