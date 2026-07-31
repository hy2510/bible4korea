"use client";

import { useEffect, useState } from "react";
import { ActivityRankingUserModal } from "@/components/ActivityRankingUserModal";
import { FriendFinderModal } from "@/components/FriendFinderModal";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import type {
  FriendDiscoveryItem,
  FriendListItem,
  FriendListResponse,
} from "@/lib/user-friends";

type FriendTab = "addedByMe" | "addedMe";

export function ProfileFriends() {
  const [addedByMeFriends, setAddedByMeFriends] = useState<
    FriendListItem[]
  >([]);
  const [addedMeFriends, setAddedMeFriends] = useState<FriendListItem[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<FriendTab>("addedByMe");
  const [selectedFriend, setSelectedFriend] =
    useState<FriendListItem | null>(null);
  const [finderOpen, setFinderOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    void authenticatedFetch("/api/friends", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as
          | FriendListResponse
          | { message?: string }
          | null;
        if (!response.ok) {
          throw new Error(
            data && "message" in data && data.message
              ? data.message
              : "친구 목록을 불러오지 못했습니다.",
          );
        }
        const friendLists = data as FriendListResponse;
        setAddedByMeFriends(friendLists.addedByMe);
        setAddedMeFriends(friendLists.addedMe);
      })
      .catch((fetchError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "친구 목록을 불러오지 못했습니다.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const friends =
    activeTab === "addedByMe" ? addedByMeFriends : addedMeFriends;

  return (
    <>
      <div
        role="tablist"
        aria-label="내 친구 메뉴"
        className="mb-6 grid grid-cols-2 rounded-xl bg-surface-muted p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "addedByMe"}
          aria-controls="friends-list-panel"
          onClick={() => setActiveTab("addedByMe")}
          className={`min-h-11 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors ${
            activeTab === "addedByMe"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          내가 찾은 친구
          <span className="ml-1 text-[11px] font-medium opacity-60">
            {addedByMeFriends.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "addedMe"}
          aria-controls="friends-list-panel"
          onClick={() => setActiveTab("addedMe")}
          className={`min-h-11 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-colors ${
            activeTab === "addedMe"
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          나를 찾은 친구
          <span className="ml-1 text-[11px] font-medium opacity-60">
            {addedMeFriends.length}
          </span>
        </button>
      </div>

      <section
        id="friends-list-panel"
        role="tabpanel"
        aria-labelledby="profile-friends-title"
        className="rounded-2xl border border-border bg-surface p-5 sm:p-7"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="profile-friends-title"
            className="font-semibold text-foreground"
          >
            {activeTab === "addedByMe"
              ? "내가 찾은 친구"
              : "나를 찾은 친구"}
          </h2>
          {activeTab === "addedByMe" && (
            <button
              type="button"
              onClick={() => setFinderOpen(true)}
              className="cursor-pointer text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-amber-800 hover:underline dark:hover:text-amber-300"
            >
              + 친구 찾기
            </button>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {activeTab === "addedByMe"
            ? "내가 추가한 친구의 말씀 읽기 활동을 확인할 수 있습니다."
            : "나를 친구로 추가한 사용자의 말씀 읽기 활동을 확인할 수 있습니다."}
        </p>

        {loading && (
          <div
            className="mt-6 space-y-2 animate-pulse"
            aria-label="친구 목록을 불러오는 중"
          >
            <div className="h-14 rounded-xl bg-surface-muted" />
            <div className="h-14 rounded-xl bg-surface-muted" />
          </div>
        )}

        {!loading && error && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-rose-50 px-4 py-5 text-center text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
          >
            {error}
          </p>
        )}

        {!loading && !error && friends.length === 0 && (
          <div className="mt-6">
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                {activeTab === "addedByMe"
                  ? "아직 내가 찾은 친구가 없습니다."
                  : "아직 나를 찾은 친구가 없습니다."}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                {activeTab === "addedByMe"
                  ? "아이디나 같은 모임의 사용자를 찾아 친구로 추가해 보세요."
                  : "다른 사용자가 나를 친구로 추가하면 이곳에 표시됩니다."}
              </p>
            </div>
          </div>
        )}

        {!loading && !error && friends.length > 0 && (
          <ul className="mt-6 space-y-2">
            {friends.map((friend) => (
              <li key={friend.username}>
                <button
                  type="button"
                  onClick={() => setSelectedFriend(friend)}
                  aria-label={`${friend.displayName}님의 말씀 읽기 활동 보기`}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:border-amber-200 hover:bg-amber-50/60 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/20 sm:px-4"
                >
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 font-sans text-sm font-bold text-amber-900 dark:bg-amber-900/45 dark:text-amber-200"
                  >
                    {friend.displayName.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {friend.displayName}
                    </span>
                    {friend.affiliation && (
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {friend.affiliation}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden
                    className="shrink-0 text-xl text-stone-300 dark:text-stone-600"
                  >
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedFriend && (
          <ActivityRankingUserModal
            key={selectedFriend.username}
            user={selectedFriend}
            onClose={() => setSelectedFriend(null)}
            onFriendshipChange={(isFriend) => {
              if (isFriend) {
                setAddedByMeFriends((current) => {
                  if (
                    current.some(
                      (friend) =>
                        friend.username === selectedFriend.username,
                    )
                  ) {
                    return current;
                  }

                  return [
                    {
                      ...selectedFriend,
                      addedAt: new Date().toISOString(),
                    },
                    ...current,
                  ];
                });
                return;
              }

              setAddedByMeFriends((current) =>
                current.filter(
                  (friend) =>
                    friend.username !== selectedFriend.username,
                ),
              );
              setSelectedFriend(null);
            }}
          />
        )}

        {finderOpen && (
          <FriendFinderModal
            onClose={() => setFinderOpen(false)}
            onFriendAdded={(friend: FriendDiscoveryItem) => {
              setAddedByMeFriends((current) => {
                if (
                  current.some(
                    (item) => item.username === friend.username,
                  )
                ) {
                  return current;
                }

                return [
                  {
                    username: friend.username,
                    displayName: friend.displayName,
                    affiliation: friend.affiliation,
                    addedAt: new Date().toISOString(),
                  },
                  ...current,
                ];
              });
            }}
          />
        )}
      </section>
    </>
  );
}
