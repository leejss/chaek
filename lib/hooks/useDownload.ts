"use client";

import { useCallback } from "react";

/**
 * Hook to handle file downloads.
 */
export function useDownload() {
  const downloadFile = useCallback(
    (content: string, filename: string, type: string = "text/plain") => {
      if (!content) return;

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [],
  );

  const downloadMarkdown = useCallback(
    (content: string, title: string) => {
      const filename = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
      downloadFile(content, filename, "text/markdown");
    },
    [downloadFile],
  );

  return { downloadFile, downloadMarkdown };
}
