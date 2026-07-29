import { normalizePronunciationText } from "@/lib/pronunciation-match";
import {
  hasAdminSession,
  isSameOriginRequest,
} from "@/lib/admin-auth.server";
import {
  isValidPronunciationSkipPhrase,
  normalizePronunciationSkipPhrase,
} from "@/lib/pronunciation-skip-words";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function authorizeMutation(request: Request): Promise<Response | null> {
  if (!isSameOriginRequest(request)) {
    return noStoreJson({ message: "허용되지 않은 요청입니다." }, 403);
  }
  if (!(await hasAdminSession())) {
    return noStoreJson({ message: "관리자 로그인이 필요합니다." }, 401);
  }
  return null;
}

export async function POST(request: Request) {
  const unauthorized = await authorizeMutation(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const rawPhrase =
    body && typeof body.phrase === "string" ? body.phrase : "";
  const phrase = normalizePronunciationSkipPhrase(rawPhrase);

  if (!isValidPronunciationSkipPhrase(phrase)) {
    return noStoreJson(
      { message: "제외할 단어나 문구를 1~50자로 입력해 주세요." },
      400,
    );
  }

  const normalizedPhrase = normalizePronunciationText(phrase);
  if (!normalizedPhrase) {
    return noStoreJson({ message: "유효한 단어나 문구를 입력해 주세요." }, 400);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return noStoreJson(
      { message: "관리자 데이터베이스 연결이 설정되지 않았습니다." },
      503,
    );
  }

  const { data, error } = await supabase
    .from("pronunciation_skip_words")
    .insert({
      phrase,
      normalized_phrase: normalizedPhrase,
    })
    .select("id, phrase, created_at")
    .single();

  if (error || !data) {
    const duplicate = error?.code === "23505";
    return noStoreJson(
      {
        message: duplicate
          ? "이미 등록된 단어나 문구입니다."
          : "제외 단어를 저장하지 못했습니다.",
      },
      duplicate ? 409 : 500,
    );
  }

  return noStoreJson(
    {
      item: {
        id: data.id,
        phrase: data.phrase,
        createdAt: data.created_at,
      },
    },
    201,
  );
}

export async function DELETE(request: Request) {
  const unauthorized = await authorizeMutation(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  const id = body && typeof body.id === "number" ? body.id : Number.NaN;
  if (!Number.isSafeInteger(id) || id < 1) {
    return noStoreJson({ message: "삭제할 항목이 올바르지 않습니다." }, 400);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return noStoreJson(
      { message: "관리자 데이터베이스 연결이 설정되지 않았습니다." },
      503,
    );
  }

  const { error } = await supabase
    .from("pronunciation_skip_words")
    .delete()
    .eq("id", id);

  if (error) {
    return noStoreJson({ message: "제외 단어를 삭제하지 못했습니다." }, 500);
  }

  return noStoreJson({ deleted: true });
}
