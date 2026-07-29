"use client";

import { useUserProfile } from "@/components/UserProfileProvider";

export function useUserNickname() {
  const { settings, displayName, loading } = useUserProfile();

  return {
    nickname: settings?.nickname ?? null,
    displayName,
    loading,
  };
}
