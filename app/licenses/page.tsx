import type { Metadata } from "next";
import Link from "next/link";
import {
  DATA_SOURCE_LICENSES,
  LICENSE_PAGE_DISCLAIMER,
  LICENSE_PAGE_INTRO,
  SOFTWARE_LICENSES,
  type LicenseEntry,
} from "@/lib/open-source-licenses";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "오픈 소스 라이선스",
  description:
    "한민족 원어 성경에서 사용하는 오픈소스 소프트웨어, 성경 데이터, API의 라이선스 정보를 확인하세요.",
  path: "/licenses",
});

function LicenseList({ items }: { items: LicenseEntry[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li
          key={item.name}
          className="rounded-xl border border-border bg-surface px-4 py-4 sm:px-5"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <h3 className="font-medium text-foreground">{item.name}</h3>
            <p className="shrink-0 text-xs font-medium text-amber-800 dark:text-amber-500/90">
              {item.license}
            </p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {item.description}
          </p>
          {item.note && (
            <p className="mt-2 text-xs leading-relaxed text-muted">{item.note}</p>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs text-amber-800 underline-offset-2 hover:underline dark:text-amber-500/90"
            >
              {item.url.replace(/^https?:\/\//, "")}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function LicensesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-serif text-2xl font-bold text-foreground">
        오픈 소스 라이선스
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        {LICENSE_PAGE_INTRO}
      </p>

      <section className="mt-10">
        <h2 className="mb-4 font-serif text-lg font-bold text-foreground">
          소프트웨어
        </h2>
        <LicenseList items={SOFTWARE_LICENSES} />
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-serif text-lg font-bold text-foreground">
          데이터 및 외부 서비스
        </h2>
        <LicenseList items={DATA_SOURCE_LICENSES} />
      </section>

      <p className="mt-10 text-xs leading-relaxed text-muted">
        {LICENSE_PAGE_DISCLAIMER}
      </p>

      <Link
        href="/"
        className="mt-8 inline-block text-sm text-amber-800 underline-offset-2 hover:underline dark:text-amber-500/90"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
