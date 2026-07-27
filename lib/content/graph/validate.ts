import type {
  GraphPlanChapter,
  GraphPlanEdge,
  GraphPlanResult,
} from "@/lib/content/contracts";

import { stableTopologicalSort } from "./topological-sort";

export const GRAPH_ISSUE_CODES = [
  "missing_reference",
  "duplicate_reference",
  "duplicate_edge",
  "dependency_cycle",
  "duplicate_introduction",
  "concept_before_introduction",
  "invalid_structural_parent",
  "invalid_edge_endpoints",
  "chapter_too_broad",
  "chapter_too_narrow",
  "unresolved_assumption",
] as const;

export type GraphIssueCode = (typeof GRAPH_ISSUE_CODES)[number];

export type GraphIssue = {
  code: GraphIssueCode;
  severity: "blocking" | "warning";
  message: string;
  refs: string[];
};

export type GraphValidationResult = {
  valid: boolean;
  issues: GraphIssue[];
  topologicalOrder: string[];
};

type NodeKind = "part" | "chapter" | "concept" | "example";

function pushIssue(
  issues: GraphIssue[],
  issue: GraphIssue,
  issueKeys: Set<string>,
) {
  const key = `${issue.code}:${[...issue.refs].sort().join(",")}`;

  if (issueKeys.has(key)) {
    return;
  }

  issueKeys.add(key);
  issues.push(issue);
}

function getChapterOrder(plan: GraphPlanResult, chapter: GraphPlanChapter) {
  const partPosition =
    plan.parts.find((part) => part.ref === chapter.partRef)?.position ??
    Number.MAX_SAFE_INTEGER;

  return [partPosition, chapter.position, chapter.ref] as const;
}

function compareChapterOrder(
  plan: GraphPlanResult,
  left: GraphPlanChapter,
  right: GraphPlanChapter,
) {
  const leftOrder = getChapterOrder(plan, left);
  const rightOrder = getChapterOrder(plan, right);

  return (
    leftOrder[0] - rightOrder[0] ||
    leftOrder[1] - rightOrder[1] ||
    leftOrder[2].localeCompare(rightOrder[2], "en")
  );
}

function isAfter(
  plan: GraphPlanResult,
  left: GraphPlanChapter,
  right: GraphPlanChapter,
) {
  return compareChapterOrder(plan, left, right) > 0;
}

function validateEdgeEndpoints(
  edge: GraphPlanEdge,
  kindsByRef: Map<string, NodeKind>,
) {
  const fromKind = kindsByRef.get(edge.fromRef);
  const toKind = kindsByRef.get(edge.toRef);

  if (!fromKind || !toKind) {
    return true;
  }

  switch (edge.type) {
    case "introduces":
    case "uses":
      return fromKind === "chapter" && toKind === "concept";
    case "requires":
      return (
        (fromKind === "chapter" && toKind === "chapter") ||
        (fromKind === "concept" && toKind === "concept")
      );
    case "continues":
      return (
        (fromKind === "chapter" && toKind === "chapter") ||
        (fromKind === "example" && toKind === "example")
      );
  }
}

export function validateGraphPlan(
  plan: GraphPlanResult,
): GraphValidationResult {
  const issues: GraphIssue[] = [];
  const issueKeys = new Set<string>();
  const kindsByRef = new Map<string, NodeKind>();
  const duplicateRefs = new Set<string>();

  const register = (nodeRef: string, kind: NodeKind) => {
    if (kindsByRef.has(nodeRef)) {
      duplicateRefs.add(nodeRef);
      return;
    }

    kindsByRef.set(nodeRef, kind);
  };

  for (const part of plan.parts) {
    register(part.ref, "part");
  }

  for (const chapter of plan.chapters) {
    register(chapter.ref, "chapter");
  }

  for (const concept of plan.concepts) {
    register(concept.ref, "concept");
  }

  for (const example of plan.examples) {
    register(example.ref, "example");
  }

  for (const duplicateRef of duplicateRefs) {
    pushIssue(
      issues,
      {
        code: "duplicate_reference",
        severity: "blocking",
        message: `The graph ref "${duplicateRef}" is declared more than once.`,
        refs: [duplicateRef],
      },
      issueKeys,
    );
  }

  const partPositions = new Set<number>();

  for (const part of plan.parts) {
    if (partPositions.has(part.position)) {
      pushIssue(
        issues,
        {
          code: "invalid_structural_parent",
          severity: "blocking",
          message: `Part position "${part.position}" is used more than once.`,
          refs: plan.parts
            .filter((candidate) => candidate.position === part.position)
            .map((candidate) => candidate.ref),
        },
        issueKeys,
      );
    }

    partPositions.add(part.position);
  }

  const chapterPositionsByPart = new Map<string, Set<number>>();

  for (const chapter of plan.chapters) {
    if (kindsByRef.get(chapter.partRef) !== "part") {
      pushIssue(
        issues,
        {
          code: "invalid_structural_parent",
          severity: "blocking",
          message: `Chapter "${chapter.ref}" must reference an existing Part.`,
          refs: [chapter.ref, chapter.partRef],
        },
        issueKeys,
      );
    }

    const siblingPositions =
      chapterPositionsByPart.get(chapter.partRef) ?? new Set<number>();

    if (siblingPositions.has(chapter.position)) {
      pushIssue(
        issues,
        {
          code: "invalid_structural_parent",
          severity: "blocking",
          message: `Chapter position "${chapter.position}" is duplicated in Part "${chapter.partRef}".`,
          refs: plan.chapters
            .filter(
              (candidate) =>
                candidate.partRef === chapter.partRef &&
                candidate.position === chapter.position,
            )
            .map((candidate) => candidate.ref),
        },
        issueKeys,
      );
    }

    siblingPositions.add(chapter.position);
    chapterPositionsByPart.set(chapter.partRef, siblingPositions);

    if (chapter.mustCover.length > 12) {
      pushIssue(
        issues,
        {
          code: "chapter_too_broad",
          severity: "warning",
          message: `Chapter "${chapter.ref}" has too many required topics.`,
          refs: [chapter.ref],
        },
        issueKeys,
      );
    }

    if (chapter.mustCover.length === 1) {
      pushIssue(
        issues,
        {
          code: "chapter_too_narrow",
          severity: "warning",
          message: `Chapter "${chapter.ref}" may be too narrow.`,
          refs: [chapter.ref],
        },
        issueKeys,
      );
    }
  }

  const edgeKeys = new Set<string>();

  for (const edge of plan.edges) {
    const missingRefs = [edge.fromRef, edge.toRef].filter(
      (nodeRef) => !kindsByRef.has(nodeRef),
    );

    if (missingRefs.length > 0) {
      pushIssue(
        issues,
        {
          code: "missing_reference",
          severity: "blocking",
          message: `Edge "${edge.fromRef} ${edge.type} ${edge.toRef}" contains an unknown ref.`,
          refs: [edge.fromRef, edge.toRef],
        },
        issueKeys,
      );
      continue;
    }

    const edgeKey = `${edge.fromRef}:${edge.type}:${edge.toRef}`;

    if (edgeKeys.has(edgeKey)) {
      pushIssue(
        issues,
        {
          code: "duplicate_edge",
          severity: "blocking",
          message: `Edge "${edgeKey}" is declared more than once.`,
          refs: [edge.fromRef, edge.toRef],
        },
        issueKeys,
      );
      continue;
    }

    edgeKeys.add(edgeKey);

    if (
      edge.fromRef === edge.toRef ||
      !validateEdgeEndpoints(edge, kindsByRef)
    ) {
      pushIssue(
        issues,
        {
          code: "invalid_edge_endpoints",
          severity: "blocking",
          message: `Edge "${edgeKey}" connects incompatible node kinds.`,
          refs: [edge.fromRef, edge.toRef],
        },
        issueKeys,
      );
    }
  }

  const requiresEdges = plan.edges.filter(
    (edge) =>
      edge.type === "requires" &&
      kindsByRef.has(edge.fromRef) &&
      kindsByRef.has(edge.toRef),
  );
  const sortResult = stableTopologicalSort(kindsByRef.keys(), requiresEdges);

  if (!sortResult.ok) {
    pushIssue(
      issues,
      {
        code: "dependency_cycle",
        severity: "blocking",
        message: "The requires graph contains a dependency cycle.",
        refs: sortResult.cycleRefs,
      },
      issueKeys,
    );
  }

  const chaptersByRef = new Map(
    plan.chapters.map((chapter) => [chapter.ref, chapter]),
  );
  const introducersByConcept = new Map<string, GraphPlanChapter[]>();

  for (const edge of plan.edges) {
    if (edge.type !== "introduces") {
      continue;
    }

    const chapter = chaptersByRef.get(edge.fromRef);

    if (!chapter || kindsByRef.get(edge.toRef) !== "concept") {
      continue;
    }

    const introducers = introducersByConcept.get(edge.toRef) ?? [];
    introducers.push(chapter);
    introducersByConcept.set(edge.toRef, introducers);
  }

  for (const [conceptRef, introducers] of introducersByConcept) {
    if (introducers.length <= 1) {
      continue;
    }

    pushIssue(
      issues,
      {
        code: "duplicate_introduction",
        severity: "blocking",
        message: `Concept "${conceptRef}" has more than one primary introducer.`,
        refs: [conceptRef, ...introducers.map((chapter) => chapter.ref)],
      },
      issueKeys,
    );
  }

  for (const edge of plan.edges) {
    if (edge.type !== "uses") {
      continue;
    }

    const usingChapter = chaptersByRef.get(edge.fromRef);
    const introducer = introducersByConcept
      .get(edge.toRef)
      ?.sort((left, right) => compareChapterOrder(plan, left, right))[0];

    if (
      !usingChapter ||
      kindsByRef.get(edge.toRef) !== "concept" ||
      (introducer && !isAfter(plan, introducer, usingChapter))
    ) {
      continue;
    }

    pushIssue(
      issues,
      {
        code: "concept_before_introduction",
        severity: "blocking",
        message: `Chapter "${usingChapter.ref}" uses concept "${edge.toRef}" before it is introduced.`,
        refs: [
          usingChapter.ref,
          edge.toRef,
          ...(introducer ? [introducer.ref] : []),
        ],
      },
      issueKeys,
    );
  }

  if (plan.unresolvedQuestions.length > 0) {
    pushIssue(
      issues,
      {
        code: "unresolved_assumption",
        severity: "warning",
        message: "The graph plan contains unresolved questions.",
        refs: [],
      },
      issueKeys,
    );
  }

  return {
    valid: !issues.some((issue) => issue.severity === "blocking"),
    issues,
    topologicalOrder: sortResult.ok ? sortResult.order : [],
  };
}
