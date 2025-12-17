"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Download } from "lucide-react";
import jsPDF from "jspdf";
import { useBook } from "@/lib/book/bookContext";
import Button from "../../_components/Button";
import MarkdownRenderer from "../../_components/MarkdownRenderer";
import { Book } from "@/lib/book/types";

export default function BookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const {
    actions: { getBookById },
  } = useBook();
  const [book, setBook] = useState<Book | undefined>(undefined);

  useEffect(() => {
    if (params.id) {
      const foundBook = getBookById(params.id as string);
      if (foundBook) {
        setBook(foundBook);
      } else {
        // Handle not found - optional: redirect or show error
        router.push("/book");
      }
    }
  }, [params.id, getBookById, router]);

  if (!book) return null;

  const handleReturnToList = () => {
    router.push("/book");
  };

  const handleDownloadPDF = () => {
    if (!book.content) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;

    // Simple text split for PDF (Advanced implementation would use HTML rendering)
    const splitText = doc.splitTextToSize(book.content, maxLineWidth);

    let y = 20;
    doc.setFont("times", "normal");
    doc.setFontSize(12);

    // Very basic pagination
    for (let i = 0; i < splitText.length; i++) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(splitText[i], margin, y);
      y += 7;
    }

    doc.save(`${book.title || "generated-book"}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white border border-stone-200 shadow-xl rounded-sm min-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      {/* Detail Toolbar */}
      <div className="px-8 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
        <button
          onClick={handleReturnToList}
          className="flex items-center text-stone-500 hover:text-brand-900 transition-colors text-sm font-medium"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Library
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="text-xs"
          >
            <Download size={14} className="mr-2" />
            Download PDF
          </Button>
          <div className="px-3 py-1 bg-brand-100 text-brand-900 text-xs font-bold rounded uppercase tracking-wider hidden sm:block">
            Read Mode
          </div>
        </div>
      </div>

      {/* Detail Content */}
      <div className="flex-1 p-8 md:p-12 overflow-y-auto">
        <div className="mb-10 text-center border-b border-stone-100 pb-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-brand-900 mb-4">
            {book.title}
          </h1>
          <p className="text-stone-400 text-sm uppercase tracking-widest">
            Created {new Date(book.createdAt).toLocaleDateString()}
          </p>
        </div>

        <MarkdownRenderer content={book.content || ""} />

        <div className="mt-16 pt-8 border-t border-stone-100 flex justify-center flex-col items-center">
          <div className="w-8 h-1 bg-stone-300 rounded mb-4"></div>
          <p className="text-stone-400 italic font-serif">End of Book</p>
        </div>
      </div>
    </div>
  );
}
