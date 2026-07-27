import assert from "node:assert/strict";
import test from "node:test";

import {
  type GraphPlanResult,
  graphPlanJsonSchema,
  graphPlanResultSchema,
} from "../lib/content/contracts";
import {
  findImpactedNodeRefs,
  stableTopologicalSort,
  validateGraphPlan,
} from "../lib/content/graph";

function createValidPlan(): GraphPlanResult {
  return {
    baseGraphVersion: 0,
    parts: [
      {
        ref: "part-1",
        title: "Foundations",
        purpose: "Build the foundations.",
        position: 0,
      },
    ],
    chapters: [
      {
        ref: "chapter-1",
        partRef: "part-1",
        title: "Tokens",
        position: 0,
        purpose: "Introduce tokens.",
        readerStateBefore: "The reader has source text.",
        readerStateAfter: "The reader can tokenize source text.",
        mustCover: ["tokenization", "vocabulary"],
        mustNotCover: ["distributed training"],
      },
      {
        ref: "chapter-2",
        partRef: "part-1",
        title: "Embeddings",
        position: 1,
        purpose: "Build vector representations.",
        readerStateBefore: "The reader can tokenize text.",
        readerStateAfter: "The reader can create embeddings.",
        mustCover: ["embedding table", "lookup"],
        mustNotCover: ["production serving"],
      },
    ],
    concepts: [
      {
        ref: "concept-token",
        name: "Token",
        canonicalDefinition: "A discrete unit consumed by the model.",
      },
    ],
    examples: [],
    edges: [
      {
        fromRef: "chapter-2",
        type: "requires",
        toRef: "chapter-1",
      },
      {
        fromRef: "chapter-1",
        type: "introduces",
        toRef: "concept-token",
      },
      {
        fromRef: "chapter-2",
        type: "uses",
        toRef: "concept-token",
      },
    ],
    unresolvedQuestions: [],
  };
}

test("the valid fixture passes deterministic graph validation", () => {
  const plan = createValidPlan();
  const first = validateGraphPlan(plan);
  const second = validateGraphPlan(plan);

  assert.equal(first.valid, true);
  assert.deepEqual(first, second);
  assert.ok(
    first.topologicalOrder.indexOf("chapter-1") <
      first.topologicalOrder.indexOf("chapter-2"),
  );
});

test("the runtime schema rejects unexpected model fields", () => {
  const result = graphPlanResultSchema.safeParse({
    ...createValidPlan(),
    databaseCommand: "DROP TABLE content_projects",
  });

  assert.equal(result.success, false);
});

test("the provider graph schema omits bounds while runtime validation keeps them", () => {
  const serializedProviderSchema = JSON.stringify(graphPlanJsonSchema);

  assert.equal(serializedProviderSchema.includes('"minimum"'), false);
  assert.equal(serializedProviderSchema.includes('"maximum"'), false);
  assert.equal(serializedProviderSchema.includes('"minItems"'), false);
  assert.equal(serializedProviderSchema.includes('"maxItems"'), false);

  const invalidRuntimePlan = createValidPlan();
  invalidRuntimePlan.parts = [];

  assert.equal(
    graphPlanResultSchema.safeParse(invalidRuntimePlan).success,
    false,
  );
});

test("a missing edge ref is blocking", () => {
  const plan = createValidPlan();
  plan.edges.push({
    fromRef: "chapter-2",
    type: "requires",
    toRef: "chapter-missing",
  });

  const result = validateGraphPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "missing_reference"));
});

test("a requires cycle is blocking", () => {
  const plan = createValidPlan();
  plan.edges.push({
    fromRef: "chapter-1",
    type: "requires",
    toRef: "chapter-2",
  });

  const result = validateGraphPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(result.issues.some((issue) => issue.code === "dependency_cycle"));
});

test("using a concept before its introducing chapter is blocking", () => {
  const plan = createValidPlan();
  plan.edges = plan.edges.filter(
    (edge) => !(edge.type === "introduces" && edge.toRef === "concept-token"),
  );
  plan.edges.push({
    fromRef: "chapter-2",
    type: "introduces",
    toRef: "concept-token",
  });
  plan.edges.push({
    fromRef: "chapter-1",
    type: "uses",
    toRef: "concept-token",
  });

  const result = validateGraphPlan(plan);

  assert.equal(result.valid, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "concept_before_introduction"),
  );
});

test("topological sorting is stable and requirements precede dependents", () => {
  const first = stableTopologicalSort(
    ["chapter-c", "chapter-a", "chapter-b"],
    [
      { fromRef: "chapter-c", toRef: "chapter-b" },
      { fromRef: "chapter-b", toRef: "chapter-a" },
    ],
  );
  const second = stableTopologicalSort(
    ["chapter-c", "chapter-a", "chapter-b"],
    [
      { fromRef: "chapter-c", toRef: "chapter-b" },
      { fromRef: "chapter-b", toRef: "chapter-a" },
    ],
  );

  assert.deepEqual(first, second);
  assert.deepEqual(first, {
    ok: true,
    order: ["chapter-a", "chapter-b", "chapter-c"],
  });
});

test("impact analysis walks from a changed requirement to downstream nodes", () => {
  const impacted = findImpactedNodeRefs(
    ["chapter-1"],
    [
      {
        fromRef: "chapter-2",
        type: "requires",
        toRef: "chapter-1",
      },
      {
        fromRef: "chapter-3",
        type: "continues",
        toRef: "chapter-2",
      },
      {
        fromRef: "chapter-4",
        type: "uses",
        toRef: "chapter-1",
      },
    ],
  );

  assert.deepEqual(impacted, ["chapter-2", "chapter-3"]);
});
