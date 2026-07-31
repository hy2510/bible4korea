import { getAuthenticatedUser } from "@/lib/auth/request.server";
import { getUserDisplayName } from "@/lib/user-profile";
import type {
  FriendListItem,
  FriendListResponse,
} from "@/lib/user-friends";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return Response.json(
      { message: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const [addedByMeResult, addedMeResult] = await Promise.all([
    authenticated.supabase
      .from("user_friends")
      .select("friend_user_id, created_at")
      .eq("owner_user_id", authenticated.user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    authenticated.supabase
      .from("user_friends")
      .select("owner_user_id, created_at")
      .eq("friend_user_id", authenticated.user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (addedByMeResult.error || addedMeResult.error) {
    return Response.json(
      { message: "친구 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  const addedByMeRows = addedByMeResult.data ?? [];
  const addedMeRows = addedMeResult.data ?? [];
  const friendUserIds = Array.from(
    new Set([
      ...addedByMeRows.map((friend) => friend.friend_user_id),
      ...addedMeRows.map((friend) => friend.owner_user_id),
    ]),
  );
  if (friendUserIds.length === 0) {
    return Response.json(
      {
        addedByMe: [],
        addedMe: [],
      } satisfies FriendListResponse,
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const [accountResult, profileResult, membershipResult] = await Promise.all([
    authenticated.supabase
      .from("user_accounts")
      .select("user_id, username")
      .in("user_id", friendUserIds),
    authenticated.supabase
      .from("user_profile_settings")
      .select("user_id, affiliation")
      .in("user_id", friendUserIds),
    authenticated.supabase
      .from("organization_memberships")
      .select("user_id, nickname")
      .in("user_id", friendUserIds)
      .eq("status", "approved"),
  ]);

  if (
    accountResult.error ||
    profileResult.error ||
    membershipResult.error
  ) {
    return Response.json(
      { message: "친구 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  const accountsByUserId = new Map(
    (accountResult.data ?? []).map((account) => [
      account.user_id,
      account,
    ]),
  );
  const profilesByUserId = new Map(
    (profileResult.data ?? []).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );
  const membershipsByUserId = new Map(
    (membershipResult.data ?? []).map((membership) => [
      membership.user_id,
      membership,
    ]),
  );
  const toFriendListItem = (
    userId: string,
    addedAt: string,
  ): FriendListItem[] => {
    const account = accountsByUserId.get(userId);
    if (!account) return [];

    const profile = profilesByUserId.get(userId);
    const membership = membershipsByUserId.get(userId);
    return [
      {
        username: account.username,
        displayName: getUserDisplayName(
          membership?.nickname ?? null,
          account.username,
        ),
        affiliation: profile?.affiliation ?? null,
        addedAt,
      },
    ];
  };
  const addedByMe = addedByMeRows.flatMap((friend) =>
    toFriendListItem(friend.friend_user_id, friend.created_at),
  );
  const addedMe = addedMeRows.flatMap((friend) =>
    toFriendListItem(friend.owner_user_id, friend.created_at),
  );

  return Response.json(
    {
      addedByMe,
      addedMe,
    } satisfies FriendListResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}
