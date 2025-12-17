import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { accessTokenConfig } from "@/lib/authTokens";

export default async function Home() {
  const cookieStore = await cookies();
  const hasAccessToken = Boolean(
    cookieStore.get(accessTokenConfig.name)?.value,
  );

  redirect(hasAccessToken ? "/book" : "/login");
}
