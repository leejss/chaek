import { createHighlighter, type Highlighter } from "shiki";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter() {
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

export async function highlightCode(content: string, language: string) {
  const highlighter = await getHighlighter();

  try {
    const html = highlighter.codeToHtml(content, {
      lang: language,
      theme: "github-light",
    });
    return html;
  } catch {
    const html = highlighter.codeToHtml(content, {
      lang: "text",
      theme: "github-light",
    });
    return html;
  }
}

export function extractTOC(markdown: string): TOCItem[] {
  const extracted: TOCItem[] = [];
  const regex = /^(#{1,3})\s+(.+)$/gm;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    const text = match[2];
    extracted.push({
      level: match[1].length,
      text,
      id: `heading-${text}`,
    });
  }

  return extracted;
}
