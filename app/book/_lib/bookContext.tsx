"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { generateTableOfContents, streamBookGeneration } from "./geminiService";
import {
  Book,
  BookActions,
  BookContextState,
  BookDraft,
  GeminiModel,
  User,
} from "./types";
import { clearMockAuth, readMockAuth, setMockAuth } from "../../_lib/authMock";

type BookContextValue = {
  state: BookContextState;
  actions: BookActions;
};

const BookContext = createContext<BookContextValue | null>(null);

const emptyDraft: BookDraft = {
  status: "draft",
  sourceText: "",
  tableOfContents: [],
  content: "",
  selectedModel: GeminiModel.FLASH,
};

const defaultUser: User = {
  id: "u1",
  name: "Author",
  email: "author@bookmaker.com",
};

const BookProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<BookDraft>(emptyDraft);
  const [streamingContent, setStreamingContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(() => {
    setIsAuthenticated(true);
    setCurrentUser(defaultUser);
    setMockAuth();
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentBook(emptyDraft);
    setStreamingContent("");
    clearMockAuth();
  }, []);

  useEffect(() => {
    if (readMockAuth()) {
      setIsAuthenticated(true);
      setCurrentUser(defaultUser);
    }
  }, []);

  const startNewBook = useCallback(() => {
    setCurrentBook(emptyDraft);
    setStreamingContent("");
    setError(null);
  }, []);

  const updateDraft = useCallback((draft: Partial<BookDraft>) => {
    setCurrentBook((prev) => ({ ...prev, ...draft }));
  }, []);

  const setActiveBook = useCallback((book: BookDraft) => {
    setCurrentBook(book);
    setStreamingContent(book.content || "");
  }, []);

  const generateTOC = useCallback(async (sourceText: string) => {
    if (!sourceText.trim()) return;
    setIsProcessing(true);
    setError(null);
    setCurrentBook((prev) => ({
      ...prev,
      sourceText,
      status: "generating_toc",
    }));
    try {
      const toc = await generateTableOfContents(sourceText);
      setCurrentBook((prev) => ({
        ...prev,
        tableOfContents: toc,
        status: "toc_review",
      }));
    } catch (err) {
      console.error(err);
      setError("TOC 생성에 실패했습니다. 다시 시도해 주세요.");
      setCurrentBook((prev) => ({ ...prev, status: "draft" }));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const regenerateTOC = useCallback(async () => {
    await generateTOC(currentBook.sourceText || "");
  }, [currentBook.sourceText, generateTOC]);

  const startBookGeneration = useCallback(
    async (model?: GeminiModel) => {
      if (!currentBook.tableOfContents.length) {
        setError("차례가 없습니다. 먼저 TOC를 생성하세요.");
        return;
      }

      const selectedModel =
        model || currentBook.selectedModel || GeminiModel.FLASH;
      setCurrentBook((prev) => ({
        ...prev,
        status: "generating_book",
        selectedModel,
      }));
      setStreamingContent("");
      setError(null);

      try {
        let fullContent = "";
        for await (const chunk of streamBookGeneration(
          currentBook.tableOfContents,
          currentBook.sourceText || "",
          selectedModel,
        )) {
          fullContent += chunk;
          setStreamingContent(fullContent);
        }

        const newBook: Book = {
          id: Date.now().toString(),
          title: currentBook.tableOfContents[0] || "Untitled Book",
          createdAt: new Date().toISOString(),
          sourceText: currentBook.sourceText,
          tableOfContents: currentBook.tableOfContents,
          content: fullContent,
          status: "completed",
          selectedModel,
        };

        setBooks((prev) => [newBook, ...prev]);
        setCurrentBook(newBook);
      } catch (err) {
        console.error(err);
        setError("본문 생성 중 오류가 발생했습니다.");
        setCurrentBook((prev) => ({ ...prev, status: "toc_review" }));
      }
    },
    [
      currentBook.selectedModel,
      currentBook.sourceText,
      currentBook.tableOfContents,
    ],
  );

  const setSelectedModel = useCallback((model: GeminiModel) => {
    setCurrentBook((prev) => ({ ...prev, selectedModel: model }));
  }, []);

  const getBookById = useCallback(
    (id: string) => books.find((b) => b.id === id),
    [books],
  );

  const state: BookContextState = useMemo(
    () => ({
      isAuthenticated,
      currentUser,
      books,
      currentBook,
      streamingContent,
      isProcessing,
      error,
    }),
    [
      books,
      currentBook,
      currentUser,
      error,
      isAuthenticated,
      isProcessing,
      streamingContent,
    ],
  );

  const actions: BookActions = useMemo(
    () => ({
      login,
      logout,
      startNewBook,
      updateDraft,
      setActiveBook,
      generateTOC,
      regenerateTOC,
      startBookGeneration,
      setSelectedModel,
      getBookById,
    }),
    [
      generateTOC,
      getBookById,
      login,
      logout,
      regenerateTOC,
      setActiveBook,
      setSelectedModel,
      startBookGeneration,
      startNewBook,
      updateDraft,
    ],
  );

  return (
    <BookContext.Provider value={{ state, actions }}>
      {children}
    </BookContext.Provider>
  );
};

export const useBook = () => {
  const ctx = useContext(BookContext);
  if (!ctx) {
    throw new Error("useBook must be used within BookProvider");
  }
  return ctx;
};

export default BookProvider;
