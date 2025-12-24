"use client";

import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { createHighlighter, type Highlighter } from "shiki";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
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
      <div className="absolute right-3 top-3 text-xs text-stone-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity uppercase">
        {language}
      </div>
      <div
        className="rounded-lg border border-stone-200 bg-stone-50 overflow-hidden text-sm"
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
    <div className="prose prose-lg prose-stone max-w-none font-serif text-ink-800">
      <ReactMarkdown
        components={{
          h1: ({ ...props }) => (
            <h1
              className="text-4xl font-bold mt-8 mb-6 text-brand-900 border-b border-brand-100 pb-4"
              {...props}
            />
          ),
          h2: ({ ...props }) => (
            <h2
              className="text-2xl font-semibold mt-8 mb-4 text-ink-900"
              {...props}
            />
          ),
          h3: ({ ...props }) => (
            <h3
              className="text-xl font-medium mt-6 mb-3 text-ink-800"
              {...props}
            />
          ),
          h4: ({ ...props }) => (
            <h4
              className="text-lg font-semibold mt-6 mb-2 text-ink-800"
              {...props}
            />
          ),
          h5: ({ ...props }) => (
            <h5
              className="text-base font-bold mt-4 mb-2 text-ink-700 uppercase tracking-wide"
              {...props}
            />
          ),
          p: ({ ...props }) => (
            <p className="leading-loose mb-4 text-lg" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 border-accent-500 pl-4 italic text-ink-400 my-6"
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const content = String(children).replace(/\n$/, "");
            const match = /language-(\w+)/.exec(className || "");

            if (!match && !content.includes("\n")) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-stone-100 text-rose-600 font-mono text-[0.9em] border border-stone-200"
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
