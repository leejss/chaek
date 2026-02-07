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
    h1: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h1
          id={`heading-${text}`}
          data-heading-text={text}
          className="mt-8 mb-6 scroll-mt-24 break-words font-black text-3xl text-black uppercase tracking-tighter md:mt-16 md:mb-12 md:text-6xl"
          {...props}
        >
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h2
          id={`heading-${text}`}
          data-heading-text={text}
          className="mt-8 mb-4 scroll-mt-24 break-words font-bold text-2xl text-black tracking-tight md:mt-12 md:mb-8 md:text-4xl"
          {...props}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: MarkdownProps) => {
      const text = typeof children === "string" ? children : String(children);
      return (
        <h3
          id={`heading-${text}`}
          data-heading-text={text}
          className="mt-6 mb-4 scroll-mt-24 break-words font-bold text-black text-xl tracking-tight md:mt-10 md:mb-6 md:text-2xl"
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4: ({ ...props }: MarkdownProps) => (
      <h4
        className="mt-6 mb-3 break-words font-bold text-black text-lg tracking-tight md:mt-8 md:mb-4 md:text-xl"
        {...props}
      />
    ),
    h5: ({ ...props }: MarkdownProps) => (
      <h5
        className="mt-4 mb-2 break-words font-bold text-base text-neutral-500 uppercase tracking-widest md:mt-6 md:mb-3 md:text-lg"
        {...props}
      />
    ),
    p: ({ ...props }: MarkdownProps) => (
      <p
        className="mb-6 break-words text-base text-neutral-900 leading-relaxed md:text-lg"
        {...props}
      />
    ),
    ul: ({ ...props }: MarkdownProps) => (
      <ul
        className="mb-6 list-disc space-y-2 pl-6 text-base text-neutral-900 marker:text-black md:text-lg"
        {...props}
      />
    ),
    ol: ({ ...props }: MarkdownProps) => (
      <ol
        className="mb-6 list-decimal space-y-2 pl-6 font-bold text-base text-neutral-900 marker:text-black md:text-lg"
        {...props}
      />
    ),
    blockquote: ({ ...props }: MarkdownProps) => (
      <blockquote
        className="my-8 break-words border-black border-l-4 pl-6 font-serif text-lg text-neutral-800 italic md:text-xl"
        {...props}
      />
    ),
    code: async ({ className, children, ...props }: MarkdownProps) => {
      const codeContent = String(children).replace(/\n$/, "");
      const match = /language-(\w+)/.exec(className || "");

      if (!match && !codeContent.includes("\n")) {
        return (
          <code
            className="break-all rounded bg-neutral-100 px-1.5 py-0.5 font-medium font-mono text-[0.8em] text-black md:text-[0.9em]"
            {...props}
          >
            {children}
          </code>
        );
      }

      const html = await highlightCode(codeContent, match?.[1] || "text");

      return (
        <div className="group relative my-6">
          <div className="absolute top-3 right-3 font-mono text-stone-400 text-xs uppercase opacity-0 transition-opacity group-hover:opacity-100">
            {match?.[1]}
          </div>
          <div className="overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 text-xs md:text-sm">
            {parse(html)}
          </div>
        </div>
      );
    },
    pre: ({ children }: MarkdownProps) => <>{children}</>,
  } as unknown as Components;

  return (
    <div className="prose prose-stone prose-base md:prose-lg max-w-none break-words prose-headings:font-medium prose-headings:font-serif prose-p:text-stone-700 prose-p:leading-relaxed">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
