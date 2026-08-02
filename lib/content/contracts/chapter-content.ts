import * as z from "zod";

import { toGeminiJsonSchema } from "./json-schema";

const shortText = z.string().trim().min(1).max(240);
const descriptiveText = z.string().trim().min(1).max(2_000);
const paragraph = z.string().trim().min(1).max(8_000);

export const partContractSchema = z.strictObject({
  purpose: descriptiveText,
});

export const chapterContractSchema = z.strictObject({
  purpose: descriptiveText,
  readerStateBefore: descriptiveText,
  readerStateAfter: descriptiveText,
  mustCover: z.array(shortText).min(1).max(20),
  mustNotCover: z.array(shortText).max(20),
});

export const conceptContractSchema = z.strictObject({
  canonicalDefinition: descriptiveText,
});

export const chapterContextPartSchema = z.strictObject({
  id: z.string().trim().min(1),
  title: shortText,
  purpose: partContractSchema.shape.purpose,
});

export const chapterContextNeighborSchema = z.strictObject({
  title: shortText,
  purpose: descriptiveText,
});

export const chapterContextConceptSchema = z.strictObject({
  name: shortText,
  canonicalDefinition: conceptContractSchema.shape.canonicalDefinition,
  relationship: z.enum(["introduces", "uses"]),
});

export const chapterContentCodeExampleSchema = z.strictObject({
  language: z.string().trim().min(1).max(40),
  code: z.string().trim().min(1).max(20_000),
  explanation: descriptiveText,
});

export const chapterContentSectionSchema = z.strictObject({
  heading: shortText,
  paragraphs: z.array(paragraph).min(1).max(12),
  codeExamples: z.array(chapterContentCodeExampleSchema).max(3),
});

export const chapterContentResultSchema = z.strictObject({
  title: shortText,
  introduction: z.array(paragraph).min(1).max(4),
  sections: z.array(chapterContentSectionSchema).min(3).max(10),
  conclusion: z.array(paragraph).min(1).max(4),
  keyTakeaways: z.array(shortText).min(3).max(10),
});

export type ChapterContract = z.infer<typeof chapterContractSchema>;
export type ChapterContentResult = z.infer<typeof chapterContentResultSchema>;

export const chapterContentJsonSchema = toGeminiJsonSchema(
  chapterContentResultSchema,
  { omitBounds: true },
);
