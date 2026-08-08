import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { createSignInPath } from "@/lib/auth/redirects";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "콘텐츠 만들기 | Chaek",
  description: "한 줄의 주제로 읽히는 콘텐츠 구조를 만듭니다.",
};

export default async function Home() {
  const session = await getCurrentSession();
  const createHref = session
    ? "/content"
    : createSignInPath({ returnTo: "/content" });

  return (
    <div className="flex flex-col flex-1 max-w-page mx-auto w-full pb-4">
      <section
        aria-labelledby="home-title"
        className="relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl"
      >
        <Image
          alt=""
          className="object-cover contrast-125 saturate-125"
          fill
          preload
          sizes="100vw"
          src="/images/dreamy-forest-hero.webp"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 w-full max-w-2xl px-5 py-12 text-white sm:px-8">
          <h1
            className="mt-4 text-center text-4xl leading-[1.08] font-medium tracking-[-0.045em] text-balance sm:text-5xl"
            id="home-title"
          >
            어떤 콘텐츠를 만들까요?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-center text-base leading-7 text-white/75">
            주제를 한 줄로 입력하면 독자와 목표를 해석해 콘텐츠의 구조를
            설계합니다.
          </p>
          <div className="mt-8 flex justify-center">
            <Link className={buttonVariants({ size: "lg" })} href={createHref}>
              생성하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
