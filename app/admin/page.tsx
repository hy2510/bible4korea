import type { Metadata } from "next";
import { AdminPronunciationManager } from "@/components/AdminPronunciationManager";
import { hasAdminSession } from "@/lib/admin-auth.server";
import type { PronunciationSkipWord } from "@/lib/pronunciation-skip-words";
import { createPageMetadata } from "@/lib/seo";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...createPageMetadata({
    title: "발음 평가 관리",
    description: "발음 평가에서 제외할 단어나 문구를 관리합니다.",
    path: "/admin",
  }),
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const authenticated = await hasAdminSession();
  let initialItems: PronunciationSkipWord[] = [];
  let initialError = "";

  if (authenticated) {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      initialError = "관리자 데이터베이스 연결이 설정되지 않았습니다.";
    } else {
      const { data, error } = await supabase
        .from("pronunciation_skip_words")
        .select("id, phrase, created_at")
        .order("created_at", { ascending: true })
        .limit(500);

      if (error) {
        initialError =
          "제외 단어 테이블을 불러오지 못했습니다. Supabase 마이그레이션을 확인해 주세요.";
      } else {
        initialItems = (data ?? []).map((item) => ({
          id: item.id,
          phrase: item.phrase,
          createdAt: item.created_at,
        }));
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-serif text-2xl font-bold text-foreground">
        발음 평가 관리
      </h1>
      <p className="mt-3 mb-7 text-sm leading-relaxed text-muted">
        음성 인식이 어려운 단어나 문구를 평가 대상에서 제외할 수 있습니다.
      </p>
      <AdminPronunciationManager
        authenticated={authenticated}
        initialItems={initialItems}
        initialError={initialError}
      />
    </div>
  );
}
