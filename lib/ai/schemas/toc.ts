import { z } from "zod";

export const TocSchema = z.object({
  title: z.string().describe("The book title"),
  chapters: z.array(z.string()).describe("List of chapter titles"),
});

export type TocOutput = z.infer<typeof TocSchema>;
