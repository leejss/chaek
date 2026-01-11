export default function BookGenerationLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <p className="text-gray-600">책 정보를 불러오는 중...</p>
      </div>
    </div>
  );
}
