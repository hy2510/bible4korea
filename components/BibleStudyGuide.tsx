import {
  featuredBodyClassName,
  featuredLabelClassName,
  featuredPanelClassName,
  featuredTitleClassName,
} from "@/lib/featured-panel";

const INTERPRETATION_PRINCIPLES = [
  {
    title: "히브리어 원문에서 시작합니다",
    description:
      "번역문과 함께 원문을 살피며 단어의 형태와 문맥을 기준으로 본문의 일차적인 의미를 분석합니다.",
  },
  {
    title: "인물의 내면적 상징을 살펴봅니다",
    description:
      "인물의 역사성을 존중하면서, 상징적 읽기에서는 그 인물이 인간 내면의 생각·성품·의식·영적 상태를 어떻게 비추는지 탐구합니다.",
  },
  {
    title: "장소와 공간의 상징을 살펴봅니다",
    description:
      "땅, 성읍, 나라, 산, 강 등의 실제 배경을 확인한 뒤, 이것이 인간의 몸·마음·감정·의식의 영역이라는 상징적 층위를 함께 살펴봅니다.",
  },
  {
    title: "하늘이 가리키는 질서를 묵상합니다",
    description:
      "하늘의 문자적 의미를 토대로 하나님의 생각과 지혜, 영적 질서, 혹은 인간의 내면을 바르게 다스리는 상위 의식이라는 의미를 탐구합니다.",
  },
  {
    title: "사건과 여정을 영혼의 성장 과정으로 읽습니다",
    description:
      "본문의 실제 사건과 여정을 이해한 뒤, 그것이 인간 영혼의 성장과 내면의 변화 과정에 어떤 통찰을 주는지 살펴봅니다.",
  },
  {
    title: "히브리어 어근과 의미의 확장을 분석합니다",
    description:
      "각 단어의 어근(שורש, Shoresh), 문법적 형태, 문자적 의미를 확인하고 문맥 안에서 가능한 확장 의미를 설명합니다.",
  },
  {
    title: "히브리어 문자의 고대 기원을 참고합니다",
    description:
      "가능한 경우 알파벳의 상징성과 고대 문자 그림(Pictograph)의 기원을 소개하되, 이것만으로 단어의 뜻을 단정하지 않습니다.",
  },
  {
    title: "게마트리아를 보충적으로 활용합니다",
    description:
      "문자의 수치를 통해 숫자적 의미와 관련 단어의 연결성을 살펴보되, 문맥과 어휘 분석을 대신하는 해석 근거로 사용하지 않습니다.",
  },
  {
    title: "Peshat 위에 Remez와 Sod를 더합니다",
    description:
      "본문이 말하는 문자적 의미(Peshat)를 먼저 확립한 다음, 암시적 의미(Remez)와 영적·신비적 의미(Sod)를 구분하여 설명합니다.",
  },
  {
    title: "PaRDeS의 층위를 따라 단계적으로 읽습니다",
    description:
      "문자적(Peshat), 암시적(Remez), 탐구적·해설적(Derash), 신비적(Sod) 해석을 서로 혼동하지 않고 순서대로 살펴봅니다.",
  },
];

const STUDY_RESPONSE_ORDER = [
  "원문 히브리어",
  "음역",
  "단어별 의미",
  "어근 분석",
  "문자적 의미(Peshat)",
  "영적·상징적 의미(Remez/Sod)",
  "인물과 장소의 내면적 상징",
  "게마트리아 분석",
  "현대 신앙인에게 주는 적용",
];

export function BibleStudyGuide({ embedded = false }: { embedded?: boolean }) {
  return (
    <section
      className={embedded ? undefined : "border-t border-stone-200/80 pt-12"}
    >
      <div className={`flex flex-col gap-10 ${embedded ? "" : "px-6"}`}>
        <header
          className={`flex flex-col gap-4 overflow-hidden ${featuredPanelClassName} px-5 py-6 sm:px-7 sm:py-8`}
        >
          <p
            className={`font-semibold uppercase tracking-[0.16em] ${featuredLabelClassName}`}
          >
            성경 연구 가이드
          </p>
          <h1
            className={`text-2xl leading-snug sm:text-3xl ${featuredTitleClassName}`}
          >
            히브리어 원문과 상징으로 읽는 성경
          </h1>
          <p className={`text-sm sm:text-base ${featuredBodyClassName}`}>
            성경을 해석할 때에는 히브리어 원문과 역사적 문맥을 먼저 확인하고, 그
            토대 위에서 인물·장소·사건이 인간의 내면과 영적 성장에 주는 상징적
            의미를 단계적으로 살펴봅니다.
          </p>
        </header>

        <aside className="flex flex-col gap-1 border-l-4 border-amber-700 px-4 py-4 text-sm leading-relaxed text-stone-600">
          <strong className="font-semibold text-stone-900">
            해석의 출발점
          </strong>
          <p>
            상징, 고대 문자 그림, 게마트리아는 묵상을 돕는 보충 자료입니다. 먼저
            본문이 말하는 문자적 의미(Peshat)를 문법·문맥·역사적 배경 안에서
            확인한 뒤 다른 해석 층위를 더합니다.
          </p>
        </aside>

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl">
              10가지 해석 원칙
            </h2>
            <p className="text-sm leading-relaxed text-stone-600">
              원문에서 시작해 상징과 적용으로 나아가는 순서입니다.
            </p>
          </div>

          <ol className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white">
            {INTERPRETATION_PRINCIPLES.map((principle, index) => (
              <li
                key={principle.title}
                className={`flex gap-4 px-4 py-4 sm:px-5 ${
                  index < INTERPRETATION_PRINCIPLES.length - 1
                    ? "border-b border-stone-200/80"
                    : ""
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="text-sm font-semibold text-stone-900 sm:text-base">
                    {principle.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-stone-600">
                    {principle.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl">
              본문 연구 흐름
            </h2>
            <p className="text-sm leading-relaxed text-stone-600">
              한 구절을 연구할 때 아래 순서로 내용을 정리하면 해석의 근거와
              묵상적 확장을 분명히 구분할 수 있습니다.
            </p>
          </div>

          <ol className="grid overflow-hidden rounded-2xl border border-stone-200/80 bg-white sm:grid-cols-3">
            {STUDY_RESPONSE_ORDER.map((item, index) => (
              <li
                key={item}
                className="flex items-center gap-3 border-b border-stone-200/80 px-4 py-3 last:border-b-0 sm:border-r sm:[&:nth-child(3n)]:border-r-0 sm:[&:nth-last-child(-n+3)]:border-b-0"
              >
                <span className="font-mono text-xs font-semibold text-amber-800/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm font-medium text-stone-700">
                  {item}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <footer className="rounded-xl bg-stone-100/80 px-4 py-4 text-sm leading-relaxed text-stone-600 dark:border dark:border-border dark:bg-[#181512] dark:text-stone-300">
          인물의 내면적 특성과 장소의 마음·의식적 의미를 묵상하되, 본문의 역사적
          인물과 실제 장소, 앞뒤 문맥을 지우지 않는 균형 잡힌 읽기를 지향합니다.
        </footer>
      </div>
    </section>
  );
}
