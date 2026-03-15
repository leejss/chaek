import { Plus, Trash2 } from "lucide-react";

type TOCReviewEditorProps = {
  tempTitle: string;
  tempTOC: string[];
  onTitleChange: (value: string) => void;
  onChapterChange: (index: number, value: string) => void;
  onAddChapter: () => void;
  onRemoveChapter: (index: number) => void;
};

export default function TOCReviewEditor({
  tempTitle,
  tempTOC,
  onTitleChange,
  onChapterChange,
  onAddChapter,
  onRemoveChapter,
}: TOCReviewEditorProps) {
  return (
    <div className="space-y-16">
      <div className="space-y-4">
        <label className="block text-xs font-semibold tracking-wide text-neutral-400">
          책 제목
        </label>
        <input
          type="text"
          value={tempTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="제목을 입력해 주세요..."
          className="w-full border-0 border-b border-neutral-200 bg-transparent py-2 text-3xl font-semibold tracking-tight text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:outline-none focus:ring-0"
        />
      </div>

      <div className="space-y-6">
        {tempTOC.map((chapter, idx) => (
          <div key={`${idx}-${chapter}`} className="group flex items-start gap-6">
            <span className="w-8 shrink-0 pt-1.5 text-left font-medium text-neutral-400">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <input
              type="text"
              value={chapter}
              onChange={(e) => onChapterChange(idx, e.target.value)}
              placeholder={`${idx + 1}장 제목 입력...`}
              className="flex-1 border-0 border-b border-neutral-200 bg-transparent py-1 text-xl font-medium text-neutral-900 placeholder:text-neutral-300 transition-colors focus:border-neutral-900 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={() => onRemoveChapter(idx)}
              className="pt-2 text-neutral-300 transition-colors hover:text-red-500"
              title="챕터 삭제"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={onAddChapter}
          className="mt-8 flex items-center gap-2 text-xs font-semibold tracking-wide text-neutral-400 transition-colors hover:text-neutral-900"
        >
          <Plus size={12} />
          챕터 추가
        </button>
      </div>
    </div>
  );
}
