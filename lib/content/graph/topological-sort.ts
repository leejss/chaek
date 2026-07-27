export type DependencyEdge = {
  fromRef: string;
  toRef: string;
};

export type TopologicalSortResult =
  | {
      ok: true;
      order: string[];
    }
  | {
      ok: false;
      cycleRefs: string[];
    };

function defaultCompare(left: string, right: string) {
  return left.localeCompare(right, "en");
}

export function stableTopologicalSort(
  nodeRefs: Iterable<string>,
  dependencyEdges: readonly DependencyEdge[],
  compare: (left: string, right: string) => number = defaultCompare,
): TopologicalSortResult {
  const refs = [...new Set(nodeRefs)];
  const refSet = new Set(refs);
  const dependencyCount = new Map(refs.map((nodeRef) => [nodeRef, 0]));
  const dependentsByRequirement = new Map<string, Set<string>>();

  for (const edge of dependencyEdges) {
    if (
      edge.fromRef === edge.toRef ||
      !refSet.has(edge.fromRef) ||
      !refSet.has(edge.toRef)
    ) {
      continue;
    }

    const dependents =
      dependentsByRequirement.get(edge.toRef) ?? new Set<string>();

    if (dependents.has(edge.fromRef)) {
      continue;
    }

    dependents.add(edge.fromRef);
    dependentsByRequirement.set(edge.toRef, dependents);
    dependencyCount.set(
      edge.fromRef,
      (dependencyCount.get(edge.fromRef) ?? 0) + 1,
    );
  }

  const ready = refs
    .filter((nodeRef) => dependencyCount.get(nodeRef) === 0)
    .sort(compare);
  const order: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift();

    if (!current) {
      break;
    }

    order.push(current);

    const dependents = [...(dependentsByRequirement.get(current) ?? [])].sort(
      compare,
    );

    for (const dependent of dependents) {
      const remaining = (dependencyCount.get(dependent) ?? 0) - 1;
      dependencyCount.set(dependent, remaining);

      if (remaining === 0) {
        ready.push(dependent);
        ready.sort(compare);
      }
    }
  }

  if (order.length === refs.length) {
    return { ok: true, order };
  }

  const ordered = new Set(order);

  return {
    ok: false,
    cycleRefs: refs.filter((nodeRef) => !ordered.has(nodeRef)).sort(compare),
  };
}
