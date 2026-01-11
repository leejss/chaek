"use client";

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

  const isValidationError = error.message.includes(
    "Invalid generationSettings",
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          {isValidationError ? "잘못된 책 설정" : "오류가 발생했습니다"}
        </h2>

        <p className="mb-6 text-sm text-gray-600">
          {isValidationError
            ? "책의 생성 설정 데이터가 손상되었거나 올바르지 않습니다. 새로운 책을 생성해 주세요."
            : "페이지를 로드하는 중 문제가 발생했습니다. 다시 시도해 주세요."}
        </p>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            다시 시도
          </button>
          <Link
            href="/book"
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            책 목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}
