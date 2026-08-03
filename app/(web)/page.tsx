import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";

import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/auth/session";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "콘텐츠 만들기 | Chaek",
  description: "한 줄의 주제로 읽히는 콘텐츠 구조를 만듭니다.",
};

export default async function Home() {
  const session = await getCurrentSession();
  const formAction = session ? "/content" : "/sign-in";

  return (
    <section
      aria-labelledby="home-title"
      className={`${styles.hero} flex items-center justify-center px-5 py-12 sm:px-8 sm:py-16`}
    >
      <div className="w-full max-w-2xl">
        <h1
          className="mt-4 text-center text-4xl leading-[1.08] font-medium tracking-[-0.045em] text-balance sm:text-5xl"
          id="home-title"
        >
          어떤 콘텐츠를 만들까요?
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-center text-base leading-7 text-muted-foreground">
          주제를 한 줄로 입력하면 독자와 목표를 해석해 콘텐츠의 구조를
          설계합니다.
        </p>

        <Form action={formAction} className="mt-9">
          <label className="sr-only" htmlFor="content-topic">
            콘텐츠 주제
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-input bg-card p-2 shadow-panel transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15">
            <input
              autoComplete="off"
              className="h-12 min-w-0 flex-1 bg-transparent px-3 text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
              id="content-topic"
              maxLength={2_000}
              minLength={3}
              name="topic"
              placeholder="예: 처음부터 구현하며 이해하는 LLM"
              required
            />
            <Button
              aria-label="콘텐츠 만들기"
              className="size-12 rounded-xl"
              size="icon-lg"
              type="submit"
            >
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          </div>
          <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
            대상 독자나 결과물의 형태까지 함께 적으면 더 구체적으로 설계할 수
            있습니다.
          </p>
        </Form>
      </div>
    </section>
  );
}
