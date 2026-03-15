"use client";

import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  setBookField,
  useBookCreationStore,
} from "@/context/bookCreationStore";
import { useTocGeneration } from "@/lib/hooks/useTocGeneration";
import TOCReviewEditor from "./toc-review/TOCReviewEditor";
import TOCReviewFooter from "./toc-review/TOCReviewFooter";
import TOCReviewHeader from "./toc-review/TOCReviewHeader";
import TOCReviewView from "./toc-review/TOCReviewView";

const tocUtils = {
  add: (toc: string[]) => [...toc, ""],
  remove: (toc: string[], index: number) => toc.filter((_, i) => i !== index),
  update: (toc: string[], index: number, value: string) =>
    toc.map((t, i) => (i === index ? value : t)),
  normalize: (toc: string[]) => toc.map((t) => t.trim()).filter(Boolean),
  formatTitle: (title: string) => title.trim() || "제목 없는 책",
};

export default function TOCReviewStep({
  onStartWriting,
}: {
  draftId: string;
  onStartWriting: () => Promise<void>;
}) {
  const { tableOfContents, bookTitle, tocGeneration } = useBookCreationStore(
    useShallow((s) => ({
      tableOfContents: s.tableOfContents,
      bookTitle: s.bookTitle,
      tocGeneration: s.tocGeneration,
    })),
  );
  const { generate } = useTocGeneration();

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempTOC, setTempTOC] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isRegenerating =
    tocGeneration.status === "loading" &&
    tocGeneration.variant === "regenerate";

  const startEditing = () => {
    setTempTitle(bookTitle);
    setTempTOC([...tableOfContents]);
    setIsEditing(true);
  };

  const saveEdits = () => {
    const normalized = tocUtils.normalize(tempTOC);
    if (normalized.length === 0) return;
    setBookField("bookTitle", tocUtils.formatTitle(tempTitle));
    setBookField("tableOfContents", normalized);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const addChapter = () => {
    setTempTOC(tocUtils.add);
  };

  const removeChapter = (index: number) => {
    setTempTOC((prev) => tocUtils.remove(prev, index));
  };

  const updateChapter = (index: number, value: string) => {
    setTempTOC((prev) => tocUtils.update(prev, index, value));
  };

  const handleStartWriting = async () => {
    if (isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      await onStartWriting();
    } catch (err) {
      console.error("Book creation failed:", err);
      setSaveError("책 생성에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (isRegenerating) return;
    await generate("regenerate");
  };

  return (
    <div className="space-y-32">
      <div className="space-y-4">
        <h2 className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl">
          구성 검토
        </h2>
        <p className="text-neutral-500">
          생성된 책의 구조를 검토합니다. 제목과 목차를 편집하거나 처음부터 다시
          생성할 수 있습니다.
        </p>
      </div>

      <div className="space-y-16">
        <TOCReviewHeader
          isEditing={isEditing}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          onSaveEdits={saveEdits}
        />

        <div className="bg-white">
          {isEditing ? (
            <TOCReviewEditor
              tempTitle={tempTitle}
              tempTOC={tempTOC}
              onTitleChange={setTempTitle}
              onChapterChange={updateChapter}
              onAddChapter={addChapter}
              onRemoveChapter={removeChapter}
            />
          ) : (
            <TOCReviewView
              bookTitle={bookTitle}
              tableOfContents={tableOfContents}
            />
          )}
        </div>

        {!isEditing && (
          <TOCReviewFooter
            saveError={saveError}
            isRegenerating={isRegenerating}
            isSaving={isSaving}
            canStartWriting={
              !isRegenerating && !isSaving && tableOfContents.length > 0
            }
            onRegenerate={handleRegenerate}
            onStartWriting={handleStartWriting}
          />
        )}
      </div>
    </div>
  );
}
