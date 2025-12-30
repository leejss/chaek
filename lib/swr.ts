import { SWRConfig } from "swr";
import { authFetch } from "@/lib/api";

async function fetcher<T>(url: string): Promise<T> {
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export { SWRConfig, fetcher };
