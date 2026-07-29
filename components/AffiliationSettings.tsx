"use client";

import { useEffect, useState } from "react";
import { useUserProfile } from "@/components/UserProfileProvider";
import { AFFILIATION_MAX_LENGTH } from "@/lib/user-affiliation";

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15";

export function AffiliationSettings() {
  const {
    settings,
    loading,
    saving,
    saveAffiliation,
    setAffiliationFilterOnly,
  } = useUserProfile();
  const [affiliation, setAffiliation] = useState("");
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const [filterSaving, setFilterSaving] = useState(false);

  const savedAffiliation = settings?.affiliation ?? null;
  const affiliationFilterOnly = Boolean(
    savedAffiliation && settings?.affiliationFilterOnly,
  );

  useEffect(() => {
    setAffiliation(settings?.affiliation ?? "");
  }, [settings?.affiliation]);

  const handleSave = async () => {
    setMessage("");
    setSucceeded(false);

    const result = await saveAffiliation(affiliation);
    setSucceeded(result.ok);
    setMessage(result.message);
  };

  const handleAffiliationFilterChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const checked = event.target.checked;
    setFilterSaving(true);
    void setAffiliationFilterOnly(checked).finally(() => {
      setFilterSaving(false);
    });
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <p className="text-center text-sm text-muted">
          소속 정보를 불러오고 있습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
      <h2 className="font-semibold text-foreground">내 소속</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        같은 소속의 말씀 읽기 순위만 모아보려면, 소속 이름을 정확히 입력해
        주세요. (띄어쓰기 유의)
      </p>

      <form
        className="mt-6"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <label
          htmlFor="profile-affiliation"
          className="block text-sm font-semibold text-foreground"
        >
          소속 이름
        </label>
        <input
          id="profile-affiliation"
          name="affiliation"
          type="text"
          autoComplete="organization"
          maxLength={AFFILIATION_MAX_LENGTH}
          value={affiliation}
          onChange={(event) => setAffiliation(event.target.value)}
          placeholder="예: ○○교회 청년부"
          className={fieldClassName}
        />

        <button
          type="submit"
          disabled={saving}
          className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "저장하는 중…" : savedAffiliation ? "변경" : "저장"}
        </button>
      </form>

      {savedAffiliation && (
        <div className="mt-6 border-t border-border pt-6">
          <label className="inline-flex cursor-pointer select-none items-center gap-1.5 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={affiliationFilterOnly}
              disabled={filterSaving || saving}
              onChange={handleAffiliationFilterChange}
              className="size-4 shrink-0 rounded accent-amber-800 disabled:cursor-wait dark:accent-amber-500"
            />
            <span>말씀 읽기 순위에서 내 소속만 모아보기</span>
          </label>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${
            succeeded
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
