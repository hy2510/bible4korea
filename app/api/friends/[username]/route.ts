import {
  isValidUsername,
  normalizeUsername,
} from "@/lib/auth/credentials";
import { getAuthenticatedUser } from "@/lib/auth/request.server";
import type { FriendshipStatusResponse } from "@/lib/user-friends";

export const dynamic = "force-dynamic";

async function getFriendContext(
  request: Request,
  rawUsername: string,
) {
  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return {
      response: Response.json(
        { message: "로그인이 필요합니다." },
        { status: 401 },
      ),
    };
  }

  const username = normalizeUsername(rawUsername);
  if (!isValidUsername(username)) {
    return {
      response: Response.json(
        { message: "사용자 정보를 확인해 주세요." },
        { status: 400 },
      ),
    };
  }

  const accountResult = await authenticated.supabase
    .from("user_accounts")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();

  if (accountResult.error) {
    return {
      response: Response.json(
        { message: "사용자 정보를 불러오지 못했습니다." },
        { status: 500 },
      ),
    };
  }
  if (!accountResult.data) {
    return {
      response: Response.json(
        { message: "사용자를 찾을 수 없습니다." },
        { status: 404 },
      ),
    };
  }
  if (accountResult.data.user_id === authenticated.user.id) {
    return {
      response: Response.json(
        { message: "자신은 친구로 추가할 수 없습니다." },
        { status: 400 },
      ),
    };
  }

  return {
    authenticated,
    friendUserId: accountResult.data.user_id,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const friendContext = await getFriendContext(request, username);
  if ("response" in friendContext) return friendContext.response;

  const friendshipResult = await friendContext.authenticated.supabase
    .from("user_friends")
    .select("friend_user_id")
    .eq("owner_user_id", friendContext.authenticated.user.id)
    .eq("friend_user_id", friendContext.friendUserId)
    .maybeSingle();

  if (friendshipResult.error) {
    return Response.json(
      { message: "친구 상태를 확인하지 못했습니다." },
      { status: 500 },
    );
  }

  return Response.json(
    {
      isFriend: Boolean(friendshipResult.data),
    } satisfies FriendshipStatusResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const friendContext = await getFriendContext(request, username);
  if ("response" in friendContext) return friendContext.response;

  const friendshipResult = await friendContext.authenticated.supabase
    .from("user_friends")
    .upsert(
      {
        owner_user_id: friendContext.authenticated.user.id,
        friend_user_id: friendContext.friendUserId,
      },
      {
        onConflict: "owner_user_id,friend_user_id",
        ignoreDuplicates: true,
      },
    );

  if (friendshipResult.error) {
    return Response.json(
      { message: "친구로 추가하지 못했습니다." },
      { status: 500 },
    );
  }

  return Response.json(
    { isFriend: true } satisfies FriendshipStatusResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  const { username } = await context.params;
  const friendContext = await getFriendContext(request, username);
  if ("response" in friendContext) return friendContext.response;

  const friendshipResult = await friendContext.authenticated.supabase
    .from("user_friends")
    .delete()
    .eq("owner_user_id", friendContext.authenticated.user.id)
    .eq("friend_user_id", friendContext.friendUserId);

  if (friendshipResult.error) {
    return Response.json(
      { message: "친구에서 삭제하지 못했습니다." },
      { status: 500 },
    );
  }

  return Response.json(
    { isFriend: false } satisfies FriendshipStatusResponse,
    { headers: { "Cache-Control": "no-store" } },
  );
}
