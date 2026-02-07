"use client";

import type React from "react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { createHighlighter, type Highlighter } from "shiki";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  onHeadingRender?: (level: number, text: string) => number | undefined;
}

// 싱글톤 하이라이터 인스턴스 (Highlighter singleton instance)
let highlighterPromise: Promise<Highlighter> | null = null;
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light"],
      langs: [
        "typescript",
        "javascript",
        "tsx",
        "jsx",
        "python",
        "json",
        "markdown",
        "bash",
        "sql",
        "css",
        "html",
        "go",
      ],
    });
  }
  return highlighterPromise;
}

const ShikiCodeBlock: React.FC<{
  content: string;
  language: string;
  isStreaming?: boolean;
}> = ({ content, language, isStreaming }) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");

  useEffect(() => {
    if (isStreaming) {
      return;
    }

    let isMounted = true;
    getHighlighter().then((highlighter) => {
      if (!isMounted) return;
      try {
        const html = highlighter.codeToHtml(content, {
          lang: language,
          theme: "github-light",
        });
        setHighlightedHtml(html);
      } catch {
        // 언어가 지원되지 않는 경우 일반 텍스트로 처리 (Fallback to text if language not supported)
        const html = highlighter.codeToHtml(content, {
          lang: "text",
          theme: "github-light",
        });
        setHighlightedHtml(html);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [content, language, isStreaming]);

  // 스트리밍 중이거나 아직 하이라이트된 HTML이 없는 경우 폴백 렌더링 (Fallback while streaming or highlighting)
  const htmlToRender =
    !isStreaming && highlightedHtml
      ? highlightedHtml
      : `<pre style="padding: 1rem; background-color: #f8fafc;"><code>${escapeHtml(
          content,
        )}</code></pre>`;

  return (
    <div className="group relative my-6">
      <div className="absolute top-3 right-3 font-mono text-neutral-400 text-xs uppercase opacity-0 transition-opacity group-hover:opacity-100">
        {language}
      </div>
      <div
        className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 text-sm"
        dangerouslySetInnerHTML={{
          __html: htmlToRender,
        }}
      />
    </div>
  );
};

// HTML 이스케이프 함수 (HTML escape function)
function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isStreaming }) => {
  return (
    <div className="prose prose-lg prose-neutral max-w-none font-sans text-black">
      <ReactMarkdown
        components={{
          h1: ({ children, ...props }) => {
            const text = typeof children === "string" ? children : String(children);
            return (
              <h1
                id={`heading-${text}`}
                data-heading-text={text}
                className="mt-8 mb-6 scroll-mt-24 border-neutral-200 border-b pb-4 font-extrabold text-4xl text-black tracking-tight"
                {...props}
              >
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const text = typeof children === "string" ? children : String(children);
            return (
              <h2
                id={`heading-${text}`}
                data-heading-text={text}
                className="mt-8 mb-4 scroll-mt-24 font-bold text-2xl text-black tracking-tight"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const text = typeof children === "string" ? children : String(children);
            return (
              <h3
                id={`heading-${text}`}
                data-heading-text={text}
                className="mt-6 mb-3 scroll-mt-24 font-bold text-black text-xl"
                {...props}
              >
                {children}
              </h3>
            );
          },
          h4: ({ ...props }) => (
            <h4 className="mt-6 mb-2 font-bold text-black text-lg" {...props} />
          ),
          h5: ({ ...props }) => (
            <h5
              className="mt-4 mb-2 font-bold text-base text-neutral-600 uppercase tracking-wide"
              {...props}
            />
          ),
          p: ({ ...props }) => <p className="mb-4 text-black text-lg leading-loose" {...props} />,
          ul: ({ ...props }) => (
            <ul className="mb-4 list-disc space-y-2 pl-6 text-black" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="mb-4 list-decimal space-y-2 pl-6 text-black" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="my-6 border-black border-l-4 pl-4 text-neutral-600 italic"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const content = String(children).replace(/\n$/, "");
            const match = /language-(\w+)/.exec(className || "");

            if (!match && !content.includes("\n")) {
              return (
                <code
                  className="rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.9em] text-black"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <ShikiCodeBlock
                language={match?.[1] || "text"}
                content={content}
                isStreaming={isStreaming}
              />
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
