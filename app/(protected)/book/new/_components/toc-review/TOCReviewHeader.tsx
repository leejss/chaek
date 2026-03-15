type TOCReviewHeaderProps = {
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEdits: () => void;
};

export default function TOCReviewHeader({
  isEditing,
  onStartEditing,
  onCancelEditing,
  onSaveEdits,
}: TOCReviewHeaderProps) {
  return (
    <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
      <h2 className="text-xs font-semibold tracking-wide text-neutral-400">
        목차 개요
      </h2>
      <div className="flex items-center gap-4">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onCancelEditing}
              className="text-xs font-semibold tracking-wide text-neutral-400 transition-colors hover:text-neutral-900"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSaveEdits}
              className="flex items-center gap-1 text-xs font-semibold tracking-wide text-neutral-900 transition-colors hover:text-neutral-600"
            >
              저장
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onStartEditing}
            className="flex items-center gap-1 text-xs font-semibold tracking-wide text-neutral-400 transition-colors hover:text-neutral-900"
          >
            편집하기
          </button>
        )}
      </div>
    </div>
  );
}
