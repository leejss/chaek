import { z } from "zod";
import { getDefaultConfig } from "@/lib/ai/config";
import {
  AIProviderSchema,
  LanguageSchema,
  ModelSchema,
} from "@/lib/ai/schemas/settings";

export const TocGenerationStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("idle") }),
  z.object({
    status: z.literal("loading"),
    variant: z.enum(["initial", "regenerate"]),
  }),
  z.object({
    status: z.literal("error"),
    message: z.string(),
  }),
]);

export const BookCreationStateSchema = z
  .object({
    language: LanguageSchema,
    chapterCount: z.union([z.number().int().positive(), z.literal("Auto")]),
    userPreference: z.string(),
    tocProvider: AIProviderSchema,
    tocModel: ModelSchema,
    contentProvider: AIProviderSchema,
    contentModel: ModelSchema,
    sourceText: z.string(),
    bookTitle: z.string(),
    tableOfContents: z.array(z.string()),
    tocGeneration: TocGenerationStateSchema,
  })
  .strict();

export type BookCreationState = z.infer<typeof BookCreationStateSchema>;
export type TocGenerationState = z.infer<typeof TocGenerationStateSchema>;

export const BOOK_CREATION_PERSISTED_KEYS: (keyof BookCreationState)[] = [
  "language",
  "chapterCount",
  "userPreference",
  "tocProvider",
  "tocModel",
  "contentProvider",
  "contentModel",
];

export const BookCreationPersistedSchema = BookCreationStateSchema.pick({
  language: true,
  chapterCount: true,
  userPreference: true,
  tocProvider: true,
  tocModel: true,
  contentProvider: true,
  contentModel: true,
});

export type BookCreationPersisted = z.infer<typeof BookCreationPersistedSchema>;

export const BookCreationDraftSnapshotSchema = BookCreationStateSchema.pick({
  language: true,
  chapterCount: true,
  userPreference: true,
  tocProvider: true,
  tocModel: true,
  contentProvider: true,
  contentModel: true,
  sourceText: true,
  bookTitle: true,
  tableOfContents: true,
});

export type BookCreationDraftSnapshot = z.infer<
  typeof BookCreationDraftSnapshotSchema
>;

export function getDefaultBookCreationState(): BookCreationState {
  const config = getDefaultConfig();
  return {
    language: "Korean",
    chapterCount: "Auto",
    userPreference: "",
    tocProvider: config.provider,
    tocModel: config.model,
    contentProvider: config.provider,
    contentModel: config.model,
    sourceText: "",
    bookTitle: "",
    tableOfContents: [],
    tocGeneration: { status: "idle" },
  };
}

export function getBookCreationDraftResetState(): Pick<
  BookCreationState,
  "sourceText" | "bookTitle" | "tableOfContents" | "tocGeneration"
> {
  return {
    sourceText: "",
    bookTitle: "",
    tableOfContents: [],
    tocGeneration: { status: "idle" },
  };
}

export function selectBookCreationPersistedState(
  state: BookCreationState,
): BookCreationPersisted {
  return {
    language: state.language,
    chapterCount: state.chapterCount,
    userPreference: state.userPreference,
    tocProvider: state.tocProvider,
    tocModel: state.tocModel,
    contentProvider: state.contentProvider,
    contentModel: state.contentModel,
  };
}

export function selectBookCreationDraftSnapshot(
  state: BookCreationState,
): BookCreationDraftSnapshot {
  return {
    language: state.language,
    chapterCount: state.chapterCount,
    userPreference: state.userPreference,
    tocProvider: state.tocProvider,
    tocModel: state.tocModel,
    contentProvider: state.contentProvider,
    contentModel: state.contentModel,
    sourceText: state.sourceText,
    bookTitle: state.bookTitle,
    tableOfContents: state.tableOfContents,
  };
}
