import * as z from "zod";

export const geminiWebhookEventTypeSchema = z.enum([
  "interaction.requires_action",
  "interaction.completed",
  "interaction.failed",
  "interaction.cancelled",
]);

export const geminiWebhookEventSchema = z.object({
  type: geminiWebhookEventTypeSchema,
  version: z.string().trim().min(1).max(32).optional(),
  timestamp: z.iso.datetime(),
  data: z.object({
    id: z.string().trim().min(1).max(240),
    error_code: z.string().trim().max(240).optional(),
    error_message: z.string().trim().max(2_000).optional(),
  }),
});

export type GeminiWebhookEvent = z.infer<typeof geminiWebhookEventSchema>;
