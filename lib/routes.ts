import type { TocGenerationStep } from "@/context/bookCreationStore";

export const ROUTES = {
  BOOK_LIST: "/book",
  BOOK_NEW: "/book/new",
} as const;

export const bookNewStepPath = (step: TocGenerationStep) => `${ROUTES.BOOK_NEW}?step=${step}`;
