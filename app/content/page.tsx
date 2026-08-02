import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import chaekIcon from "@/app/icon.png";
import { ContentCompilerView } from "@/components/content-compiler-view";
import { ThemeMenu } from "@/components/theme-menu";
import { getCurrentSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "콘텐츠 | Chaek",
  description: "주제를 입력하고 콘텐츠 구조가 완성되는 과정을 확인합니다.",
};

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{
    buildId?: string;
    nodeId?: string;
    projectId?: string;
  }>;
}) {
  const [params, session] = await Promise.all([
    searchParams,
    getCurrentSession(),
  ]);

  return (
    <main className="min-h-svh px-5 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex h-20 items-center justify-between border-b border-border">
          <Link
            className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/20"
            href="/content"
          >
            <Image alt="" className="size-8 rounded-md" src={chaekIcon} />
            <span className="text-sm font-semibold tracking-[-0.02em]">
              Chaek
            </span>
          </Link>
          <ThemeMenu />
        </header>

        <ContentCompilerView
          initialBuildId={params.buildId ?? null}
          initialNodeId={params.nodeId ?? null}
          initialProjectId={params.projectId ?? null}
          isAuthenticated={Boolean(session)}
        />
      </div>
    </main>
  );
}
