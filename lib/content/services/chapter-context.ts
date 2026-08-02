import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import {
  type ChapterDraftingJobInput,
  chapterContentResultSchema,
  chapterContractSchema,
  conceptContractSchema,
  contentBriefResultSchema,
  partContractSchema,
} from "@/lib/content/contracts";
import { CHAPTER_PROMPT_VERSION } from "@/lib/content/prompts";
import { getDb } from "@/lib/db";
import {
  contentEdges,
  contentNodes,
  contentProjects,
} from "@/lib/db/schema";

import {
  ContentChapterNotFoundError,
  InvalidChapterContextError,
} from "../errors";

async function getOwnedChapterRecord(
  userId: string,
  projectId: string,
  nodeId: string,
) {
  const [record] = await getDb()
    .select({
      chapter: contentNodes,
      project: contentProjects,
    })
    .from(contentNodes)
    .innerJoin(contentProjects, eq(contentNodes.projectId, contentProjects.id))
    .where(
      and(
        eq(contentNodes.id, nodeId),
        eq(contentNodes.projectId, projectId),
        eq(contentNodes.kind, "chapter"),
        eq(contentProjects.userId, userId),
      ),
    )
    .limit(1);

  if (!record) {
    throw new ContentChapterNotFoundError();
  }

  return record;
}

function readNeighbor(
  node: typeof contentNodes.$inferSelect | undefined,
) {
  if (!node) {
    return null;
  }

  const contract = chapterContractSchema.safeParse(node.contractJson);

  if (!contract.success) {
    throw new InvalidChapterContextError();
  }

  return {
    title: node.title,
    purpose: contract.data.purpose,
  };
}

export async function compileChapterDraftingContext(
  userId: string,
  projectId: string,
  nodeId: string,
): Promise<ChapterDraftingJobInput> {
  const { chapter, project } = await getOwnedChapterRecord(
    userId,
    projectId,
    nodeId,
  );

  if (!chapter.parentId) {
    throw new InvalidChapterContextError();
  }

  const db = getDb();
  const [partRows, siblingChapters, relatedEdges] = await Promise.all([
    db
      .select()
      .from(contentNodes)
      .where(
        and(
          eq(contentNodes.id, chapter.parentId),
          eq(contentNodes.projectId, projectId),
          eq(contentNodes.kind, "part"),
        ),
      )
      .limit(1),
    db
      .select()
      .from(contentNodes)
      .where(
        and(
          eq(contentNodes.projectId, projectId),
          eq(contentNodes.parentId, chapter.parentId),
          eq(contentNodes.kind, "chapter"),
        ),
      )
      .orderBy(asc(contentNodes.position), asc(contentNodes.createdAt)),
    db
      .select({
        relationship: contentEdges.type,
        targetNodeId: contentEdges.toNodeId,
      })
      .from(contentEdges)
      .where(
        and(
          eq(contentEdges.projectId, projectId),
          eq(contentEdges.fromNodeId, nodeId),
          inArray(contentEdges.type, ["introduces", "uses"]),
        ),
      ),
  ]);

  const part = partRows[0];
  const brief = contentBriefResultSchema.safeParse(project.briefJson);
  const partContract = partContractSchema.safeParse(part?.contractJson);
  const chapterContract = chapterContractSchema.safeParse(chapter.contractJson);

  if (
    !part ||
    !brief.success ||
    !partContract.success ||
    !chapterContract.success
  ) {
    throw new InvalidChapterContextError();
  }

  const chapterIndex = siblingChapters.findIndex(
    (sibling) => sibling.id === chapter.id,
  );

  if (chapterIndex < 0) {
    throw new InvalidChapterContextError();
  }

  const targetNodeIds = [...new Set(relatedEdges.map((edge) => edge.targetNodeId))];
  const conceptNodes =
    targetNodeIds.length > 0
      ? await db
          .select()
          .from(contentNodes)
          .where(
            and(
              eq(contentNodes.projectId, projectId),
              eq(contentNodes.kind, "concept"),
              inArray(contentNodes.id, targetNodeIds),
            ),
          )
      : [];
  const conceptsById = new Map(conceptNodes.map((concept) => [concept.id, concept]));
  const relationshipsByConcept = new Map<string, "introduces" | "uses">();

  for (const edge of relatedEdges) {
    if (edge.relationship !== "introduces" && edge.relationship !== "uses") {
      continue;
    }

    const current = relationshipsByConcept.get(edge.targetNodeId);

    if (!current || edge.relationship === "introduces") {
      relationshipsByConcept.set(edge.targetNodeId, edge.relationship);
    }
  }

  const concepts = [...relationshipsByConcept.entries()]
    .map(([conceptId, relationship]) => {
      const concept = conceptsById.get(conceptId);
      const contract = conceptContractSchema.safeParse(concept?.contractJson);

      if (!concept || !contract.success) {
        throw new InvalidChapterContextError();
      }

      return {
        name: concept.title,
        canonicalDefinition: contract.data.canonicalDefinition,
        relationship,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    promptVersion: CHAPTER_PROMPT_VERSION,
    payloadVersion: 1,
    baseGraphVersion: project.graphVersion,
    seedInput: project.seedInput,
    brief: brief.data,
    part: {
      id: part.id,
      title: part.title,
      purpose: partContract.data.purpose,
    },
    chapter: {
      id: chapter.id,
      title: chapter.title,
      contract: chapterContract.data,
    },
    neighboringChapters: {
      previous: readNeighbor(siblingChapters[chapterIndex - 1]),
      next: readNeighbor(siblingChapters[chapterIndex + 1]),
    },
    concepts,
  };
}

export async function getContentChapter(
  userId: string,
  projectId: string,
  nodeId: string,
) {
  const { chapter, project } = await getOwnedChapterRecord(
    userId,
    projectId,
    nodeId,
  );
  const contract = chapterContractSchema.safeParse(chapter.contractJson);
  const content = chapter.contentJson
    ? chapterContentResultSchema.safeParse(chapter.contentJson)
    : null;

  if (!contract.success || (content && !content.success)) {
    throw new InvalidChapterContextError();
  }

  const [part] = chapter.parentId
    ? await getDb()
        .select({
          id: contentNodes.id,
          position: contentNodes.position,
          title: contentNodes.title,
        })
        .from(contentNodes)
        .where(
          and(
            eq(contentNodes.id, chapter.parentId),
            eq(contentNodes.projectId, projectId),
            eq(contentNodes.kind, "part"),
          ),
        )
        .limit(1)
    : [];

  if (!part) {
    throw new InvalidChapterContextError();
  }

  return {
    id: chapter.id,
    project: {
      id: project.id,
      title: project.title,
    },
    part,
    position: chapter.position,
    title: chapter.title,
    editorialStatus: chapter.editorialStatus,
    contract: contract.data,
    content: content?.data ?? null,
  };
}
