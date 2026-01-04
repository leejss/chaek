import parse from "html-react-parser";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { highlightCode } from "@/lib/book/serverMarkdown";

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
          className="text-6xl font-black tracking-tighter mt-16 mb-12 text-black scroll-mt-24 uppercase"
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
          className="text-4xl font-bold mt-12 mb-8 text-black scroll-mt-24 tracking-tight"
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
          className="text-2xl font-bold mt-10 mb-6 text-black scroll-mt-24 tracking-tight"
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4: ({ ...props }: MarkdownProps) => (
      <h4
        className="text-xl font-bold mt-8 mb-4 text-black tracking-tight"
        {...props}
      />
    ),
    h5: ({ ...props }: MarkdownProps) => (
      <h5
        className="text-lg font-bold mt-6 mb-3 text-neutral-500 uppercase tracking-widest"
        {...props}
      />
    ),
    p: ({ ...props }: MarkdownProps) => (
      <p className="leading-relaxed mb-6 text-lg text-neutral-900" {...props} />
    ),
    ul: ({ ...props }: MarkdownProps) => (
      <ul
        className="list-disc pl-6 mb-6 space-y-2 text-lg text-neutral-900 marker:text-black"
        {...props}
      />
    ),
    ol: ({ ...props }: MarkdownProps) => (
      <ol
        className="list-decimal pl-6 mb-6 space-y-2 text-lg text-neutral-900 marker:text-black font-bold"
        {...props}
      />
    ),
    blockquote: ({ ...props }: MarkdownProps) => (
      <blockquote
        className="border-l-4 border-black pl-6 italic text-xl text-neutral-800 my-8 font-serif"
        {...props}
      />
    ),
    code: async ({ className, children, ...props }: MarkdownProps) => {
      const codeContent = String(children).replace(/\n$/, "");
      const match = /language-(\w+)/.exec(className || "");

      if (!match && !codeContent.includes("\n")) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-neutral-100 text-black font-mono text-[0.9em] font-medium"
            {...props}
          >
            {children}
          </code>
        );
      }

      const html = await highlightCode(codeContent, match?.[1] || "text");

      return (
        <div className="relative my-6 group">
          <div className="absolute right-3 top-3 text-xs text-stone-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase">
            {match?.[1]}
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 overflow-hidden text-sm">
            {parse(html)}
          </div>
        </div>
      );
    },
    pre: ({ children }: MarkdownProps) => <>{children}</>,
  } as unknown as Components;

  return (
    <div className="prose prose-stone prose-lg max-w-none prose-headings:font-serif prose-headings:font-medium prose-p:leading-relaxed prose-p:text-stone-700">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
