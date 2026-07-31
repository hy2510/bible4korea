import type { Metadata } from "next";
import { AboutHeroActions } from "@/components/AboutHeroActions";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "서비스 소개",
  description:
    "성경 읽기와 발음 확인, 히브리어·헬라어 원문 탐구, 일일 목표와 개인 기록, 모임과 친구 기능을 간결하게 소개합니다.",
  path: "/about",
});

const FEATURES = [
  {
    eyebrow: "성경 읽기",
    title: "본문을 편안하게 읽으세요",
    description:
      "전체 보기와 한 절씩 보기를 오가며 읽고, 단어·구절·Strong’s 번호로 필요한 말씀을 찾을 수 있습니다.",
  },
  {
    eyebrow: "소리 내어 읽기",
    title: "한 절씩 읽고 발음을 확인하세요",
    description:
      "말씀을 소리 내어 읽으면 인식된 내용과 발음 결과를 확인하고 다음 절로 자연스럽게 이어갈 수 있습니다.",
  },
  {
    eyebrow: "원문 탐구",
    title: "히브리어와 헬라어를 살펴보세요",
    description:
      "원문 단어의 뜻과 형태, Strong’s 정보와 다른 구절의 용례를 한 화면에서 깊이 살펴볼 수 있습니다.",
  },
  {
    eyebrow: "목표와 기록",
    title: "나의 읽기 흐름을 이어가세요",
    description:
      "일일 목표와 달성 달력, 주간 활동과 통독 기록을 확인하고 완독 메달과 통독 트로피를 모을 수 있습니다.",
  },
  {
    eyebrow: "내 모임",
    title: "함께 읽는 모임을 만들어 보세요",
    description:
      "모임을 만들거나 검색해 가입하고, 승인된 같은 모임 구성원의 활동을 확인할 수 있습니다.",
  },
  {
    eyebrow: "내 친구",
    title: "친구와 읽기 활동을 나누세요",
    description:
      "아이디나 같은 모임에서 친구를 찾고, 친구로 연결된 사용자끼리 말씀 읽기 활동을 확인할 수 있습니다.",
  },
] as const;

const USAGE_TIPS = [
  {
    title: "매일 부담 없이",
    description: "한 절부터 시작해 나에게 맞는 읽기 흐름을 만들어 보세요.",
  },
  {
    title: "궁금한 단어는 바로",
    description: "본문에서 단어 분석을 열어 원어의 의미와 어근을 살펴보세요.",
  },
  {
    title: "목표와 기록은 한눈에",
    description: "오늘의 진행률과 주간 활동, 달성 기록을 간편하게 확인하세요.",
  },
  {
    title: "함께 읽고 싶을 때",
    description: "내 모임과 내 친구에서 필요한 사람들과 활동을 나눠보세요.",
  },
] as const;

export default function AboutPage() {
  return (
    <main className="overflow-hidden">
      <section className="about-hero-motion relative border-b border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#fff7ed_52%,#ffffff_100%)] dark:border-stone-800 dark:bg-[linear-gradient(135deg,#1c1917_0%,#292524_55%,#1c1917_100%)]">
        <div
          aria-hidden="true"
          className="about-hero-orb absolute -right-24 -top-28 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl dark:bg-amber-900/15"
        />
        <div
          aria-hidden="true"
          className="about-hero-orb about-hero-orb--secondary absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-950/15"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight text-stone-950 sm:text-5xl sm:leading-tight dark:text-stone-50">
            말씀을 소리 내어 읽고,
            <br className="hidden sm:block" /> 깊이 깨달아 보세요.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg dark:text-stone-300">
            <strong className="font-extrabold text-amber-900 dark:text-amber-300">
              한민족 원어 성경
            </strong>
            에서 한 절씩 읽고 히브리어·헬라어 원문을 함께 살펴보세요.
          </p>
          <AboutHeroActions />
        </div>
      </section>

      <section className="border-y border-stone-200/70 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-950/40">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-[0.2em] text-amber-700 dark:text-amber-400">
              KEY FEATURES
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-100">
              주요 기능
            </h2>
            <p className="mt-4 leading-7 text-stone-600 dark:text-stone-400">
              말씀 읽기와 원문 탐구부터 개인 기록, 모임과 친구 활동까지
              필요한 기능을 간결하게 확인해 보세요.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {FEATURES.map((feature) => (
              <article
                key={feature.eyebrow}
                className="flex flex-col rounded-3xl border border-stone-200/80 bg-white p-6 sm:p-7 dark:border-stone-800 dark:bg-stone-900"
              >
                <p className="text-[11px] font-bold tracking-[0.18em] text-amber-700 dark:text-amber-400">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-2 text-xl font-bold leading-snug text-stone-900 dark:text-stone-100">
                  {feature.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-stone-300">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-amber-700 dark:text-amber-400">
              SIMPLE USE
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              나에게 맞게,
              <br />
              가볍게 시작하세요
            </h2>
          </div>
          <ul className="divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-800 dark:border-stone-800">
            {USAGE_TIPS.map((item) => (
              <li key={item.title} className="py-5 sm:py-6">
                <h3 className="font-bold text-stone-900 dark:text-stone-100">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="rounded-3xl border border-amber-100 bg-[linear-gradient(135deg,#fffbeb_0%,#fff7ed_52%,#ffffff_100%)] px-6 py-10 text-center sm:px-10 sm:py-14 dark:border-stone-800 dark:bg-[linear-gradient(135deg,#1c1917_0%,#292524_55%,#1c1917_100%)]">
          <h2 className="font-serif text-2xl font-bold text-stone-950 sm:text-3xl dark:text-stone-50">
            오늘부터 시작하세요.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600 sm:text-base dark:text-stone-300">
            한 절씩 소리 내어 읽으며 말씀의 뜻을 더 깊이 깨달아 보세요.
          </p>
          <AboutHeroActions variant="closing" />
        </div>
      </section>
    </main>
  );
}
