import parse from "html-react-parser";
import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { highlightCode } from "@/lib/serverMarkdown";

type MarkdownProps = {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
};

interface BookMarkdownProps {
  content: string;
}

export default function BookMarkdown({ content }: BookMarkdownProps) {
  const components = {
    // h1 — 챕터 시작: 상단 구분선 + 넓은 여백으로 새 챕터임을 명확히 표시
    h1: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h1
          id={`heading-${text}`}
          data-heading-text={text}
          className="mt-20 mb-8 scroll-mt-24 break-words border-t border-neutral-100 pt-16 text-3xl font-semibold tracking-tight text-neutral-900 md:mt-28 md:mb-10 md:pt-20 md:text-4xl"
          {...props}
        >
          {children}
        </h1>
      );
    },
    // h2 — 섹션 헤더: h1보다 작고 여백도 좁게
    h2: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h2
          id={`heading-${text}`}
          data-heading-text={text}
          className="mt-12 mb-5 scroll-mt-24 break-words text-xl font-semibold tracking-tight text-neutral-800 md:mt-16 md:mb-6 md:text-2xl"
          {...props}
        >
          {children}
        </h2>
      );
    },
    // h3 — 소제목: 색을 연하게 해 "하위 항목"임을 시각적으로 구분
    h3: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h3
          id={`heading-${text}`}
          data-heading-text={text}
          className="mt-8 mb-3 scroll-mt-24 break-words text-base font-medium tracking-tight text-neutral-500 md:mt-10 md:mb-4 md:text-lg"
          {...props}
        >
          {children}
        </h3>
      );
    },
    // h4 — 세부 항목
    h4: ({ ...props }: MarkdownProps) => (
      <h4
        className="mt-6 mb-2 break-words text-sm font-medium uppercase tracking-widest text-neutral-400 md:mt-8 md:mb-3"
        {...props}
      />
    ),
    h5: ({ ...props }: MarkdownProps) => (
      <h5
        className="mt-4 mb-2 break-words text-sm font-medium text-neutral-400 md:mt-6 md:mb-3"
        {...props}
      />
    ),
    p: ({ ...props }: MarkdownProps) => (
      <p
        className="mb-6 break-words text-base leading-relaxed text-neutral-600 md:text-lg md:leading-loose"
        {...props}
      />
    ),
    ul: ({ ...props }: MarkdownProps) => (
      <ul
        className="mb-6 list-disc space-y-2 pl-6 text-base text-neutral-600 md:text-lg"
        {...props}
      />
    ),
    ol: ({ ...props }: MarkdownProps) => (
      <ol
        className="mb-6 list-decimal space-y-2 pl-6 text-base text-neutral-600 md:text-lg"
        {...props}
      />
    ),
    blockquote: ({ ...props }: MarkdownProps) => (
      <blockquote
        className="my-8 break-words border-l-[3px] border-neutral-200 pl-6 text-base italic text-neutral-400 md:text-lg"
        {...props}
      />
    ),
    code: async ({ className, children, ...props }: MarkdownProps) => {
      const codeContent = String(children).replace(/\n$/, "");
      const match = /language-(\w+)/.exec(className || "");

      if (!match && !codeContent.includes("\n")) {
        return (
          <code
            className="break-all rounded-md bg-neutral-100/80 px-1.5 py-0.5 font-mono text-[0.8em] text-neutral-800 md:text-[0.9em]"
            {...props}
          >
            {children}
          </code>
        );
      }

      const html = await highlightCode(codeContent, match?.[1] || "text");

      return (
        <div className="group relative my-8">
          <div className="absolute top-3 right-3 font-mono text-neutral-400 text-xs opacity-0 transition-opacity group-hover:opacity-100">
            {match?.[1]}
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-100 bg-neutral-50/50 text-xs md:text-sm">
            {parse(html)}
          </div>
        </div>
      );
    },
    pre: ({ children }: MarkdownProps) => <>{children}</>,
  } as unknown as Components;

  return (
    <ReactMarkdown components={components}>{content}</ReactMarkdown>
  );
}
