import { HEBREW_ALPHABET } from "@/data/hebrew-alphabet";

export function HebrewAlphabetGuide() {
  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800/70">
            Hebrew alphabet
          </p>
          <h2 className="font-serif text-xl font-bold text-stone-900 sm:text-2xl">
            히브리어 알파벳 살펴보기
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-base">
          히브리어 문자의 이름과 수치, 고대 그림 문자의 기원을 한눈에
          살펴보세요. 그림과 핵심 의미는 문자의 역사적 배경과 상징적 묵상을
          돕는 참고 자료이며, 단어의 실제 뜻은 어근과 문법, 문맥을 통해 먼저
          확인해야 합니다.
        </p>
      </header>

      <div className="flex flex-col gap-1 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950/80 sm:flex-row sm:gap-2">
        <strong className="font-semibold text-amber-950">읽는 방법</strong>
        <span>
          문자 → 이름 → 수치 → 고대 그림 → 핵심 의미 순서로 비교해 보세요.
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200/80 bg-white">
        <table className="w-full min-w-[640px] border-collapse text-center text-sm">
          <caption className="sr-only">
            히브리어 알파벳의 문자, 이름, 수치, 고대 그림과 핵심 의미
          </caption>
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50/80 dark:border-border dark:bg-[#181512]">
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                문자
              </th>
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                이름
              </th>
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                수치
              </th>
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                고대 그림
              </th>
              <th className="px-3 py-3 font-semibold text-stone-700 dark:text-stone-300">
                핵심 의미
              </th>
            </tr>
          </thead>
          <tbody>
            {HEBREW_ALPHABET.map((entry) => (
              <tr
                key={entry.letter}
                className="border-b border-stone-100 last:border-b-0"
              >
                <td className="px-3 py-3 font-hebrew text-2xl text-stone-800">
                  {entry.letter}
                </td>
                <td className="px-3 py-3 text-stone-700">{entry.name}</td>
                <td className="px-3 py-3 text-stone-600">{entry.value}</td>
                <td className="px-3 py-3 text-stone-600">{entry.picture}</td>
                <td className="px-3 py-3 text-stone-600">{entry.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
