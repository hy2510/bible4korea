import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("로그인 설정을 확인해 주세요.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("로그인이 필요합니다.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}
