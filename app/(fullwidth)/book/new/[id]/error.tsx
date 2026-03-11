"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BookGenerationError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("BookGenerationPage error:", error);
  }, [error]);

  const isValidationError = error.message.includes("Invalid generationSettings");

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <AlertCircle className="h-10 w-10 text-red-500" strokeWidth={1.5} />
        </div>

        <h2 className="mb-3 font-medium text-xl text-neutral-900">
          {isValidationError ? "잘못된 책 설정" : "오류가 발생했습니다"}
        </h2>

        <p className="mb-8 text-neutral-500 text-sm leading-relaxed">
          {isValidationError
            ? "책의 생성 설정 데이터가 손상되었거나 올바르지 않습니다. 새로운 책을 생성해 주세요."
            : "페이지를 로드하는 중 문제가 발생했습니다. 다시 시도해 주세요."}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-full bg-neutral-100 px-6 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            다시 시도
          </button>
          <Link
            href="/book"
            className="inline-flex h-10 items-center justify-center rounded-full bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            책 목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
