import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { accessTokenConfig } from "@/lib/authTokens";

export default async function Home() {
  const cookieStore = await cookies();
  const value = cookieStore.get(accessTokenConfig.name)?.value;
  const hasAccessToken = typeof value === "string" && value.trim().length > 0;

  redirect(hasAccessToken ? "/book" : "/login");
}
