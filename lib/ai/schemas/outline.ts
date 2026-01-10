import { z } from "zod";

export const SectionSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

export const ChapterOutlineSchema = z.object({
  chapterNumber: z.number(),
  chapterTitle: z.string(),
  sections: z.array(SectionSchema),
});

export type Section = z.infer<typeof SectionSchema>;
export type ChapterOutlineOutput = z.infer<typeof ChapterOutlineSchema>;
