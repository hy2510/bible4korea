"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  EMPTY_USER_PROFILE_SETTINGS,
  getUserDisplayName,
  isValidNickname,
  mapUserProfileRow,
  normalizeNickname,
  NICKNAME_MAX_LENGTH,
  type UserProfileSettings,
} from "@/lib/user-profile";
import {
  isValidAffiliation,
  normalizeAffiliation,
} from "@/lib/user-affiliation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface SaveResult {
  ok: boolean;
  message: string;
}

interface UserProfileContextValue {
  settings: UserProfileSettings | null;
  loading: boolean;
  saving: boolean;
  displayName: string;
  saveNickname: (value: string) => Promise<SaveResult>;
  saveAffiliation: (value: string) => Promise<SaveResult>;
  setAffiliationFilterOnly: (enabled: boolean) => Promise<boolean>;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user, username } = useAuth();
  const userId = user?.id ?? null;
  const [settings, setSettings] = useState<UserProfileSettings | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [saving, setSaving] = useState(false);
  const loadGenerationRef = useRef(0);

  const loadSettings = useCallback(async (targetUserId: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSettings(EMPTY_USER_PROFILE_SETTINGS);
      setLoading(false);
      return;
    }

    const generation = ++loadGenerationRef.current;
    setLoading(true);

    const { data, error } = await supabase
      .from("user_profile_settings")
      .select("affiliation, nickname, affiliation_filter_only")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (generation !== loadGenerationRef.current) return;

    setSettings(
      error || !data
        ? EMPTY_USER_PROFILE_SETTINGS
        : mapUserProfileRow(data),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      loadGenerationRef.current += 1;
      setSettings(null);
      setLoading(false);
      return;
    }

    void loadSettings(userId);
  }, [loadSettings, userId]);

  const patchSettings = useCallback(
    async (
      partial: Partial<{
        affiliation: string | null;
        nickname: string | null;
        affiliation_filter_only: boolean;
      }>,
    ) => {
      if (!userId) return false;

      const supabase = getSupabaseBrowserClient();
      if (!supabase) return false;

      setSaving(true);
      const { error } = await supabase.from("user_profile_settings").upsert(
        {
          user_id: userId,
          ...partial,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      setSaving(false);

      if (error) return false;

      setSettings((current) => ({
        ...(current ?? EMPTY_USER_PROFILE_SETTINGS),
        ...(partial.affiliation !== undefined
          ? { affiliation: partial.affiliation }
          : {}),
        ...(partial.nickname !== undefined
          ? { nickname: partial.nickname }
          : {}),
        ...(partial.affiliation_filter_only !== undefined
          ? { affiliationFilterOnly: partial.affiliation_filter_only }
          : {}),
      }));

      return true;
    },
    [userId],
  );

  const saveNickname = useCallback(
    async (value: string): Promise<SaveResult> => {
      const normalized = normalizeNickname(value);
      if (!isValidNickname(normalized)) {
        return {
          ok: false,
          message: `별명은 1~${NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
        };
      }

      const ok = await patchSettings({ nickname: normalized || null });
      return ok
        ? {
            ok: true,
            message: normalized
              ? "별명을 저장했습니다."
              : "별명을 삭제했습니다.",
          }
        : {
            ok: false,
            message: "별명을 저장하지 못했습니다. 다시 시도해 주세요.",
          };
    },
    [patchSettings],
  );

  const saveAffiliation = useCallback(
    async (value: string): Promise<SaveResult> => {
      const normalized = normalizeAffiliation(value);
      if (!isValidAffiliation(normalized)) {
        return {
          ok: false,
          message: "소속은 1~50자로 입력해 주세요.",
        };
      }

      const ok = await patchSettings({
        affiliation: normalized,
        affiliation_filter_only: true,
      });

      return ok
        ? { ok: true, message: "소속을 저장했습니다." }
        : {
            ok: false,
            message: "소속을 저장하지 못했습니다. 다시 시도해 주세요.",
          };
    },
    [patchSettings],
  );

  const setAffiliationFilterOnly = useCallback(
    async (enabled: boolean) => {
      return patchSettings({ affiliation_filter_only: enabled });
    },
    [patchSettings],
  );

  const displayName = getUserDisplayName(settings?.nickname, username);

  const value = useMemo(
    () => ({
      settings,
      loading,
      saving,
      displayName,
      saveNickname,
      saveAffiliation,
      setAffiliationFilterOnly,
    }),
    [
      settings,
      loading,
      saving,
      displayName,
      saveNickname,
      saveAffiliation,
      setAffiliationFilterOnly,
    ],
  );

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error("useUserProfile must be used within UserProfileProvider");
  }
  return context;
}
