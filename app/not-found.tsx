import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-6xl font-bold text-amber-800/20">404</p>
      <h1 className="mt-4 font-serif text-xl font-bold text-stone-900">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-2 text-stone-600">
        요청하신 성경 구절이 존재하지 않거나 주소가 잘못되었습니다.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-900"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
