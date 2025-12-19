"use client";

import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, Library } from "lucide-react";
import { useBookStore } from "@/lib/book/bookContext";
import { Book } from "@/lib/book/types";
import Button from "./_components/Button";

export default function LibraryPage() {
  const router = useRouter();
  const books = useBookStore((state) => state.books);
  const { startNewBook, setActiveBook } = useBookStore(
    (state) => state.actions,
  );

  const handleStartNewBook = () => {
    startNewBook();
    router.push("/book/new");
  };

  const handleBookClick = (book: Book) => {
    setActiveBook(book);
    if (book.status === "completed") {
      router.push(`/book/${book.id}`);
    } else {
      // If it's a draft, go back to creation wizard
      router.push("/book/new");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div>
          <h2 className="text-3xl font-serif text-ink-900">Library</h2>
          <p className="text-stone-500 mt-1">
            Manage your generated literary works.
          </p>
        </div>
        {books.length > 0 && (
          <Button onClick={handleStartNewBook}>
            <Plus size={18} className="mr-2" />
            Create New Book
          </Button>
        )}
      </div>

      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed border-stone-200 rounded-lg bg-stone-50/50">
          <Library size={48} className="text-stone-300 mb-4" />
          <h3 className="text-xl font-serif text-stone-700 mb-2">
            No books created yet
          </h3>
          <p className="text-stone-500 mb-6 max-w-sm">
            Your library is empty. Start your first masterpiece by converting
            raw ideas into structured chapters.
          </p>
          <Button onClick={handleStartNewBook}>
            <Plus size={18} className="mr-2" />
            Create New Book
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => handleBookClick(book)}
              className="group bg-white border border-stone-200 p-6 rounded-sm shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 border-l-brand-600 relative"
            >
              <h3 className="font-serif text-xl font-bold text-ink-900 mb-2 truncate">
                {book.title}
              </h3>
              <p className="text-xs text-stone-400 uppercase tracking-wider mb-4">
                {new Date(book.createdAt).toLocaleDateString()}
              </p>
              <div className="text-stone-600 text-sm line-clamp-3 mb-6 font-serif leading-relaxed">
                {book.content
                  ? book.content.substring(0, 150) + "..."
                  : "No content preview available."}
              </div>
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-stone-100">
                <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded">
                  {book.status === "completed" ? "Completed" : "Draft"}
                </span>
                {/* Visual indicator arrow */}
                <span className="text-stone-400 group-hover:text-brand-900 transition-colors">
                  <ChevronLeft className="rotate-180" size={20} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
