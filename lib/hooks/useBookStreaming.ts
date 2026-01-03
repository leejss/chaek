// "use client";

// import { useRef, useState, useCallback } from "react";
// import { authFetch } from "@/lib/api";
// import { useBookStore } from "@/lib/book/bookContext";
// import { useGenerationStore } from "@/lib/book/generationContext";
// import { useSettingsStore } from "@/lib/book/settingsStore";
// import type { AIProvider, GeminiModel, ClaudeModel } from "@/lib/book/types";

// interface StreamingParams {
//   bookId: string;
//   provider: AIProvider;
//   model: GeminiModel | ClaudeModel;
//   startFromChapter?: number;
// }

// interface SSEEvent {
//   type: string;
//   data: Record<string, unknown>;
// }

// export function useBookStreaming() {
//   const bookStore = useBookStore();
//   const genStore = useGenerationStore((state) => state);
//   const settings = useSettingsStore();
//   const abortRef = useRef<AbortController | null>(null);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const parseSSELine = (
//     line: string,
//   ): { event: string; data: string } | null => {
//     if (line.startsWith("event: ")) {
//       const event = line.slice(7);
//       return { event, data: "" };
//     }
//     if (line.startsWith("data: ")) {
//       return { event: "", data: line.slice(6) };
//     }
//     return null;
//   };

//   const handleEvent = useCallback(
//     (event: SSEEvent) => {
//       switch (event.type) {
//         case "progress": {
//           bookStore.actions.setFlowStatus("generating");
//           break;
//         }
//         case "chapter_start": {
//           const totalChapters = bookStore.tableOfContents.length;
//           genStore.actions.setSavedBookId(genStore.savedBookId);
//           genStore.actions.setupGeneration(totalChapters);
//           break;
//         }
//         case "chunk": {
//           const data = event.data as {
//             chapterNumber: number;
//             sectionIndex: number;
//             content: string;
//           };
//           const { streamingContent, currentChapterContent } = genStore;
//           genStore.actions.updateDraft({
//             streamingContent: streamingContent + data.content,
//             currentChapterContent: currentChapterContent + data.content,
//           });
//           break;
//         }
//         case "chapter_complete": {
//           break;
//         }
//         case "book_complete": {
//           genStore.actions.completeGeneration();
//           break;
//         }
//         case "error": {
//           const data = event.data as { message: string };
//           genStore.actions.failGeneration(data.message);
//           setError(data.message);
//           break;
//         }
//       }
//     },
//     [bookStore, genStore],
//   );

//   const generate = useCallback(
//     async (params: StreamingParams) => {
//       if (isGenerating) return;

//       const { tableOfContents, sourceText, bookTitle } = bookStore;

//       if (!tableOfContents.length) {
//         const err = "차례가 없습니다. 먼저 TOC를 생성하세요.";
//         setError(err);
//         return;
//       }

//       const bookId = params.bookId;

//       abortRef.current = new AbortController();
//       setIsGenerating(true);
//       setError(null);

//       try {
//         genStore.actions.setSavedBookId(bookId);
//         genStore.actions.setupGeneration(tableOfContents.length);

//         const response = await authFetch(`/api/books/${bookId}/stream`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             title: bookTitle?.trim() || "Untitled Book",
//             tableOfContents,
//             sourceText: sourceText || "",
//             provider: params.provider,
//             model: params.model,
//             language: settings.language,
//             userPreference: settings.userPreference,
//             startFromChapter: params.startFromChapter,
//           }),
//           signal: abortRef.current.signal,
//         });

//         if (!response.ok) {
//           const json = (await response.json()) as { error?: string };
//           throw new Error(json.error || "스트리밍 시작에 실패했습니다.");
//         }

//         if (!response.body) {
//           throw new Error("응답 본문이 없습니다.");
//         }

//         const reader = response.body.getReader();

//         const decoder = new TextDecoder();
//         let currentEvent: SSEEvent | null = null;

//         while (true) {
//           const { done, value } = await reader.read();
//           if (done) break;

//           const lines = decoder.decode(value).split("\n");
//           for (const line of lines) {
//             const parsed = parseSSELine(line);
//             if (!parsed) continue;

//             if (parsed.event) {
//               currentEvent = { type: parsed.event, data: {} };
//             } else if (parsed.data && currentEvent) {
//               try {
//                 currentEvent.data = JSON.parse(parsed.data);
//               } catch {
//                 // JSON parse 실패 시 무시
//               }
//             }

//             if (
//               currentEvent &&
//               parsed.data &&
//               Object.keys(currentEvent.data).length > 0
//             ) {
//               handleEvent(currentEvent);
//               currentEvent = null;
//             }
//           }
//         }
//       } catch (err) {
//         if (err instanceof Error && err.name === "AbortError") {
//           genStore.actions.failGeneration("생성이 취소되었습니다.");
//         } else {
//           const message =
//             err instanceof Error ? err.message : "알 수 없는 오류";
//           genStore.actions.failGeneration(message);
//           setError(message);
//         }
//       } finally {
//         setIsGenerating(false);
//         abortRef.current = null;
//       }
//     },
//     [bookStore, settings, isGenerating, handleEvent],
//   );

//   const cancel = useCallback(() => {
//     abortRef.current?.abort();
//   }, []);

//   return {
//     generate,
//     cancel,
//     isGenerating,
//     error,
//   };
// }
