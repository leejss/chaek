import type { TocGenerationStep } from "@/context/bookCreationStore";

export const ROUTES = {
  BOOK_LIST: "/book",
  BOOK_NEW: "/book/new",
} as const;

export const bookNewStepPath = (step: TocGenerationStep, draftId?: string) => {
  const params = new URLSearchParams({ step });
  if (draftId) params.set("draftId", draftId);
  return `${ROUTES.BOOK_NEW}?${params.toString()}`;
};
