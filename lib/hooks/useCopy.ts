"use client";

import { useState, useCallback } from "react";

/**
 * Hook to handle copying text to clipboard with a success state timeout.
 * @param timeoutDuration Duration in ms to keep the isCopied state true. Default 2000ms.
 */
export function useCopy(timeoutDuration: number = 2000) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string) => {
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), timeoutDuration);
        return true;
      } catch (err) {
        console.error("Failed to copy", err);
        return false;
      }
    },
    [timeoutDuration],
  );

  return { isCopied, copyToClipboard };
}
