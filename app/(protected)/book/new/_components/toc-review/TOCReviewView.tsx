type TOCReviewViewProps = {
  bookTitle: string;
  tableOfContents: string[];
};

export default function TOCReviewView({
  bookTitle,
  tableOfContents,
}: TOCReviewViewProps) {
  return (
    <div className="space-y-16">
      <div className="space-y-4">
        <h2 className="text-xs font-semibold tracking-wide text-neutral-400">
          책 제목
        </h2>
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          {bookTitle || "제목 없는 책"}
        </h1>
      </div>

      {tableOfContents.length > 0 ? (
        <div className="space-y-6">
          {tableOfContents.map((chapter, idx) => (
            <div key={`${idx}-${chapter}`} className="flex items-start gap-6">
              <span className="w-8 shrink-0 pt-0.5 text-left font-medium text-neutral-400">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="text-xl leading-relaxed font-medium text-neutral-900">
                {chapter}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-neutral-400">아직 목차가 없습니다.</div>
      )}
    </div>
  );
}
