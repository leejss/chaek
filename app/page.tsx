import { redirect } from "next/navigation";

export default function Home() {
  const isAuthenticated = true;
  redirect(isAuthenticated ? "/book" : "/login");
}
