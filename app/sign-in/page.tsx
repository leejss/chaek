import type { Metadata } from "next";

import {
  SignInContent,
  type SignInSearchParams,
} from "@/components/sign-in-content";

export const metadata: Metadata = {
  title: "로그인 | Chaek",
};

export default function SignInPage({
  searchParams,
}: {
  searchParams: SignInSearchParams;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-12 sm:px-8">
      <section
        aria-labelledby="sign-in-title"
        className="w-full max-w-md rounded-2xl border bg-card p-6 text-card-foreground shadow-panel sm:p-8"
      >
        <SignInContent searchParams={searchParams} />
      </section>
    </main>
  );
}
