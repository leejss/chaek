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
          className="text-4xl font-bold mt-8 mb-6 text-brand-900 border-b border-brand-100 pb-4 scroll-mt-24"
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
          className="text-2xl font-semibold mt-8 mb-4 text-ink-900 scroll-mt-24"
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
          className="text-xl font-medium mt-6 mb-3 text-ink-800 scroll-mt-24"
          {...props}
        >
          {children}
        </h3>
      );
    },
    h4: ({ ...props }: MarkdownProps) => (
      <h4 className="text-lg font-semibold mt-6 mb-2 text-ink-800" {...props} />
    ),
    h5: ({ ...props }: MarkdownProps) => (
      <h5
        className="text-base font-bold mt-4 mb-2 text-ink-700 uppercase tracking-wide"
        {...props}
      />
    ),
    p: ({ ...props }: MarkdownProps) => (
      <p className="leading-loose mb-4 text-lg" {...props} />
    ),
    ul: ({ ...props }: MarkdownProps) => (
      <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
    ),
    ol: ({ ...props }: MarkdownProps) => (
      <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />
    ),
    blockquote: ({ ...props }: MarkdownProps) => (
      <blockquote
        className="border-l-4 border-accent-500 pl-4 italic text-ink-400 my-6"
        {...props}
      />
    ),
    code: async ({ className, children, ...props }: MarkdownProps) => {
      const codeContent = String(children).replace(/\n$/, "");
      const match = /language-(\w+)/.exec(className || "");

      if (!match && !codeContent.includes("\n")) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-stone-100 text-rose-600 font-mono text-[0.9em] border border-stone-200"
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
