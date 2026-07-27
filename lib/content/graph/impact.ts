import type { GraphPlanEdge, GraphPlanEdgeType } from "@/lib/content/contracts";

const DEFAULT_PROPAGATING_EDGE_TYPES = new Set<GraphPlanEdgeType>([
  "requires",
  "continues",
]);

export function findImpactedNodeRefs(
  changedNodeRefs: Iterable<string>,
  edges: readonly GraphPlanEdge[],
  propagatingEdgeTypes: ReadonlySet<GraphPlanEdgeType> = DEFAULT_PROPAGATING_EDGE_TYPES,
) {
  const changed = new Set(changedNodeRefs);
  const impacted = new Set<string>();
  const queue = [...changed];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    for (const edge of edges) {
      if (
        edge.toRef !== current ||
        !propagatingEdgeTypes.has(edge.type) ||
        changed.has(edge.fromRef) ||
        impacted.has(edge.fromRef)
      ) {
        continue;
      }

      impacted.add(edge.fromRef);
      queue.push(edge.fromRef);
    }
  }

  return [...impacted].sort((left, right) => left.localeCompare(right, "en"));
}
