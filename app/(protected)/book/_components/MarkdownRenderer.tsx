"use client";

import React, { useEffect, useState } from "react";
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
    <div className="relative my-6 group">
      <div className="absolute right-3 top-3 text-xs text-neutral-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase">
        {language}
      </div>
      <div
        className="rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden text-sm"
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

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isStreaming,
}) => {
  return (
    <div className="prose prose-lg prose-neutral max-w-none font-sans text-black">
      <ReactMarkdown
        components={{
          h1: ({ children, ...props }) => {
            const text =
              typeof children === "string" ? children : String(children);
            return (
              <h1
                id={`heading-${text}`}
                data-heading-text={text}
                className="text-4xl font-extrabold mt-8 mb-6 text-black border-b border-neutral-200 pb-4 scroll-mt-24 tracking-tight"
                {...props}
              >
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const text =
              typeof children === "string" ? children : String(children);
            return (
              <h2
                id={`heading-${text}`}
                data-heading-text={text}
                className="text-2xl font-bold mt-8 mb-4 text-black scroll-mt-24 tracking-tight"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const text =
              typeof children === "string" ? children : String(children);
            return (
              <h3
                id={`heading-${text}`}
                data-heading-text={text}
                className="text-xl font-bold mt-6 mb-3 text-black scroll-mt-24"
                {...props}
              >
                {children}
              </h3>
            );
          },
          h4: ({ ...props }) => (
            <h4 className="text-lg font-bold mt-6 mb-2 text-black" {...props} />
          ),
          h5: ({ ...props }) => (
            <h5
              className="text-base font-bold mt-4 mb-2 text-neutral-600 uppercase tracking-wide"
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <p className="leading-loose mb-4 text-lg text-black" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul
              className="list-disc pl-6 mb-4 space-y-2 text-black"
              {...props}
            />
          ),
          ol: ({ ...props }) => (
            <ol
              className="list-decimal pl-6 mb-4 space-y-2 text-black"
              {...props}
            />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-black pl-4 italic text-neutral-600 my-6"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const content = String(children).replace(/\n$/, "");
            const match = /language-(\w+)/.exec(className || "");

            if (!match && !content.includes("\n")) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-neutral-100 text-black font-mono text-[0.9em] border border-neutral-200"
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
