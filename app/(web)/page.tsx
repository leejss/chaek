import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "콘텐츠 만들기 | Chaek",
  description: "한 줄의 주제로 읽히는 콘텐츠 구조를 만듭니다.",
};

export default async function Home() {
  return (
    <div className="px-4 pb-4 flex flex-col flex-1">
      <section
        aria-labelledby="home-title"
        className={`flex flex-1 items-center justify-center border rounded-2xl`}
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
        </div>
      </section>
    </div>
  );
}
