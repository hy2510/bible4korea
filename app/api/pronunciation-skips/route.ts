import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return Response.json(
      { words: [] },
      {
        headers: {
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        },
      },
    );
  }

  const { data, error } = await supabase
    .from("pronunciation_skip_words")
    .select("phrase")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    return Response.json(
      { words: [] },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(
    { words: (data ?? []).map(({ phrase }) => phrase) },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
