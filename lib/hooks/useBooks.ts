import useSWR from "swr";
import { authFetch } from "@/lib/api";
import { Book } from "@/lib/book/types";

interface BooksResponse {
  books: Book[];
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function useBooks() {
  const { data, error, isLoading, mutate } = useSWR<BooksResponse>(
    "/api/books",
    fetcher
  );

  return {
    books: data?.books ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useBook(id: string) {
  const { data, error, isLoading } = useSWR<{ book: Book }>(
    `/api/books/${id}`,
    fetcher
  );

  return {
    book: data?.book ?? null,
    isLoading,
    error,
  };
}
