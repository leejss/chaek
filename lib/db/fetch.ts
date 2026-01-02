import { authFetch } from "@/lib/api";
import { Book } from "@/lib/book/types";
import z from "zod";

interface DeductCreditsResponse {
  ok: boolean;
  error?: string;
}

export async function fetchDeductCredits(bookId: string): Promise<void> {
  const response = await authFetch(`/api/books/${bookId}/deduct-credits`, {
    method: "POST",
  });

  const data: DeductCreditsResponse = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(data.error || "Failed to deduct credits");
  }
}

export async function fetchBookById(id: string): Promise<Book> {
  const response = await authFetch(`/api/books/${id}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch book");
  }

  const data = await response.json();
  return data.book as Book;
}

export type SaveBookParams = {
  title: string;
  tableOfContents: string[];
  sourceText?: string;
  content?: string;
};

export const SaveBookResponseSchema = z.object({
  data: z.object({
    bookId: z.string(),
  }),
});

export async function saveBook(params: SaveBookParams) {
  const response = await authFetch("/api/book/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(response.statusText);
  const result = await response.json();
  return SaveBookResponseSchema.parse(result).data.bookId;
}
