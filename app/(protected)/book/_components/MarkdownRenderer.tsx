"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-lg prose-stone max-w-none font-serif text-ink-800">
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-4xl font-bold mt-8 mb-6 text-brand-900 border-b border-brand-100 pb-4"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-2xl font-semibold mt-8 mb-4 text-ink-900"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-xl font-medium mt-6 mb-3 text-ink-800"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p className="leading-loose mb-4 text-lg" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-accent-500 pl-4 italic text-ink-400 my-6"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
