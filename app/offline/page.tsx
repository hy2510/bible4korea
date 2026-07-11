import Link from "next/link";

export const metadata = {
  title: "오프라인",
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="mb-2 text-sm font-medium text-amber-800">오프라인</p>
      <h1 className="font-serif text-2xl font-bold text-stone-900">
        인터넷 연결이 없습니다
      </h1>
      <p className="mt-3 text-stone-600">
        네트워크에 연결한 뒤 다시 시도해 주세요.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
      >
        홈으로
      </Link>
    </div>
  );
}
