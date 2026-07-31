"use client";

import { useAuth } from "@/components/AuthProvider";

export function useUserNickname() {
  const { username, loading } = useAuth();

  return {
    displayName: username?.trim() || "회원",
    loading,
  };
}
