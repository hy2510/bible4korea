import { getAuthenticatedUser } from "@/lib/auth/request.server";
import { readJsonObject, readString } from "@/lib/auth/api.server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import {
  isValidOrganizationDescription,
  isValidOrganizationName,
  isValidOrganizationNickname,
  isValidOrganizationPassword,
  isOrganizationPasswordAction,
  normalizeOrganizationDescription,
  normalizeOrganizationName,
  normalizeOrganizationNickname,
  ORGANIZATION_DESCRIPTION_MAX_LENGTH,
  ORGANIZATION_NICKNAME_MAX_LENGTH,
  ORGANIZATION_PASSWORD_MAX_LENGTH,
  ORGANIZATION_PASSWORD_MIN_LENGTH,
  toOrganizationNameKey,
  type MyOrganizationResponse,
  type OrganizationMember,
} from "@/lib/organizations";
import { getUserDisplayName } from "@/lib/user-profile";

export const dynamic = "force-dynamic";

function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-profile",
    120,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return noStoreJson({ message: "로그인이 필요합니다." }, 401);
  }

  const membershipResult = await authenticated.supabase
    .from("organization_memberships")
    .select(
      "organization_id, nickname, role, status, requested_at, approved_at",
    )
    .eq("user_id", authenticated.user.id)
    .maybeSingle();

  if (membershipResult.error) {
    return noStoreJson(
      { message: "모임 정보를 불러오지 못했습니다." },
      500,
    );
  }
  if (!membershipResult.data) {
    return noStoreJson({
      membership: null,
    } satisfies MyOrganizationResponse);
  }

  const membership = membershipResult.data;
  const organizationResult = await authenticated.supabase
    .from("organizations")
    .select("id, name, description, join_password_hash")
    .eq("id", membership.organization_id)
    .maybeSingle();

  if (organizationResult.error || !organizationResult.data) {
    return noStoreJson(
      { message: "모임 정보를 불러오지 못했습니다." },
      500,
    );
  }

  let members: OrganizationMember[] = [];
  if (membership.role === "owner" && membership.status === "approved") {
    const memberResult = await authenticated.supabase
      .from("organization_memberships")
      .select(
        "user_id, nickname, role, status, requested_at, approved_at",
      )
      .eq("organization_id", membership.organization_id)
      .order("status", { ascending: false })
      .order("requested_at", { ascending: true })
      .limit(200);

    if (memberResult.error) {
      return noStoreJson(
        { message: "모임 회원을 불러오지 못했습니다." },
        500,
      );
    }

    const memberRows = memberResult.data ?? [];
    const userIds = memberRows.map((member) => member.user_id);
    if (userIds.length > 0) {
      const accountResult = await authenticated.supabase
        .from("user_accounts")
        .select("user_id, username")
        .in("user_id", userIds);

      if (accountResult.error) {
        return noStoreJson(
          { message: "모임 회원 정보를 불러오지 못했습니다." },
          500,
        );
      }

      const accountsByUserId = new Map(
        (accountResult.data ?? []).map((account) => [
          account.user_id,
          account,
        ]),
      );
      members = memberRows.flatMap((member) => {
        const account = accountsByUserId.get(member.user_id);
        if (!account) return [];

        return [
          {
            userId: member.user_id,
            username: account.username,
            displayName: getUserDisplayName(
              member.nickname,
              account.username,
            ),
            role: member.role,
            status: member.status,
            requestedAt: member.requested_at,
            approvedAt: member.approved_at,
          } satisfies OrganizationMember,
        ];
      });
    }
  }

  return noStoreJson({
    membership: {
      organizationId: organizationResult.data.id,
      organizationName: organizationResult.data.name,
      nickname: membership.nickname,
      description: organizationResult.data.description,
      requiresPassword: Boolean(
        organizationResult.data.join_password_hash,
      ),
      role: membership.role,
      status: membership.status,
      requestedAt: membership.requested_at,
      approvedAt: membership.approved_at,
      members,
    },
  } satisfies MyOrganizationResponse);
}

export async function POST(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-create",
    10,
    60 * 60,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return noStoreJson({ message: "로그인이 필요합니다." }, 401);
  }

  const body = readJsonObject(await request.json().catch(() => null));
  const name = body ? readString(body, "name") : "";
  const rawNickname = body ? readString(body, "nickname") : "";
  const nickname = normalizeOrganizationNickname(rawNickname);
  const rawDescription = body ? readString(body, "description") : "";
  const description = normalizeOrganizationDescription(rawDescription);
  const password = body ? readString(body, "password") : "";
  const passwordConfirmation = body
    ? readString(body, "passwordConfirmation")
    : "";
  if (!isValidOrganizationName(name)) {
    return noStoreJson(
      { message: "모임 이름은 1~50자로 입력해 주세요." },
      400,
    );
  }
  if (!isValidOrganizationNickname(rawNickname)) {
    return noStoreJson(
      {
        message: `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
      },
      400,
    );
  }
  if (!isValidOrganizationDescription(rawDescription)) {
    return noStoreJson(
      {
        message: `모임 설명은 ${ORGANIZATION_DESCRIPTION_MAX_LENGTH}자 이내로 입력해 주세요.`,
      },
      400,
    );
  }
  if (!isValidOrganizationPassword(password)) {
    return noStoreJson(
      {
        message: `모임 비밀번호는 설정하지 않거나 ${ORGANIZATION_PASSWORD_MIN_LENGTH}~${ORGANIZATION_PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      },
      400,
    );
  }
  if (password !== passwordConfirmation) {
    return noStoreJson(
      { message: "모임 비밀번호가 서로 일치하지 않습니다." },
      400,
    );
  }

  const { error } = await authenticated.supabase.rpc(
    "create_organization",
    {
      p_owner_user_id: authenticated.user.id,
      p_name: name,
      p_nickname: nickname,
      p_description: description || null,
      p_password: password || null,
    },
  );

  if (error) {
    const conflict =
      error.message.includes("organization_name_taken") ||
      error.message.includes("already_has_organization_membership");
    return noStoreJson(
      {
        message: error.message.includes("organization_name_taken")
          ? "이미 사용 중인 모임 이름입니다."
          : error.message.includes("already_has_organization_membership")
            ? "이미 가입했거나 가입 요청 중인 모임이 있습니다."
            : "모임을 만들지 못했습니다. 다시 시도해 주세요.",
      },
      error.message.includes("invalid_organization_nickname")
        ? 400
        : conflict
          ? 409
          : 500,
    );
  }

  return noStoreJson({ message: "모임을 만들었습니다." }, 201);
}

export async function PATCH(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-update",
    20,
    60 * 60,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return noStoreJson({ message: "로그인이 필요합니다." }, 401);
  }

  const body = readJsonObject(await request.json().catch(() => null));
  const rawName = body ? readString(body, "name") : "";
  const name = normalizeOrganizationName(rawName);
  const rawNickname = body ? readString(body, "nickname") : "";
  const nickname = normalizeOrganizationNickname(rawNickname);
  const rawDescription = body ? readString(body, "description") : "";
  const description = normalizeOrganizationDescription(rawDescription);
  const passwordAction = body ? readString(body, "passwordAction") : "";
  const password = body ? readString(body, "password") : "";
  const passwordConfirmation = body
    ? readString(body, "passwordConfirmation")
    : "";

  if (!isValidOrganizationName(rawName)) {
    return noStoreJson(
      { message: "모임 이름은 1~50자로 입력해 주세요." },
      400,
    );
  }
  if (!isValidOrganizationNickname(rawNickname)) {
    return noStoreJson(
      {
        message: `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
      },
      400,
    );
  }
  if (!isValidOrganizationDescription(rawDescription)) {
    return noStoreJson(
      {
        message: `모임 설명은 ${ORGANIZATION_DESCRIPTION_MAX_LENGTH}자 이내로 입력해 주세요.`,
      },
      400,
    );
  }
  if (!isOrganizationPasswordAction(passwordAction)) {
    return noStoreJson(
      { message: "모임 비밀번호 변경 방식을 확인해 주세요." },
      400,
    );
  }
  if (
    passwordAction === "set" &&
    (!password || !isValidOrganizationPassword(password))
  ) {
    return noStoreJson(
      {
        message: `새 모임 비밀번호는 ${ORGANIZATION_PASSWORD_MIN_LENGTH}~${ORGANIZATION_PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      },
      400,
    );
  }
  if (passwordAction === "set" && password !== passwordConfirmation) {
    return noStoreJson(
      { message: "새 모임 비밀번호가 서로 일치하지 않습니다." },
      400,
    );
  }

  const { data: ownership, error: ownershipError } =
    await authenticated.supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", authenticated.user.id)
      .eq("role", "owner")
      .eq("status", "approved")
      .maybeSingle();

  if (ownershipError) {
    return noStoreJson(
      { message: "모임 정보를 수정하지 못했습니다. 다시 시도해 주세요." },
      500,
    );
  }
  if (!ownership) {
    return noStoreJson(
      { message: "모임장만 모임 정보를 수정할 수 있습니다." },
      403,
    );
  }

  const organizationId = ownership.organization_id;
  const now = new Date().toISOString();
  const normalizedKey = toOrganizationNameKey(name);

  if (passwordAction === "set" || passwordAction === "remove") {
    const { error: passwordUpdateError } = await authenticated.supabase.rpc(
      "update_owned_organization",
      {
        p_owner_user_id: authenticated.user.id,
        p_name: name,
        p_nickname: nickname,
        p_description: description || null,
        p_password: passwordAction === "set" ? password : null,
        p_password_action: passwordAction,
      },
    );

    if (passwordUpdateError) {
      const message = passwordUpdateError.message;
      const ownerRequired = message.includes("organization_owner_required");
      const nameTaken = message.includes("organization_name_taken");
      const invalidNickname = message.includes(
        "invalid_organization_nickname",
      );
      const missingFunction =
        message.toLowerCase().includes("could not find the function") ||
        message.toLowerCase().includes("schema cache");

      if (!missingFunction) {
        return noStoreJson(
          {
            message: ownerRequired
              ? "모임장만 모임 정보를 수정할 수 있습니다."
              : nameTaken
                ? "이미 사용 중인 모임 이름입니다."
                : invalidNickname
                  ? `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`
                  : "모임 정보를 수정하지 못했습니다. 다시 시도해 주세요.",
          },
          ownerRequired ? 403 : nameTaken ? 409 : invalidNickname ? 400 : 500,
        );
      }

      // Older DB without p_nickname: update password via legacy RPC, then
      // apply nickname with a direct membership update.
      const { error: legacyError } = await authenticated.supabase.rpc(
        "update_owned_organization",
        {
          p_owner_user_id: authenticated.user.id,
          p_name: name,
          p_description: description || null,
          p_password: passwordAction === "set" ? password : null,
          p_password_action: passwordAction,
        } as never,
      );

      if (legacyError) {
        const legacyMessage = legacyError.message;
        return noStoreJson(
          {
            message: legacyMessage.includes("organization_owner_required")
              ? "모임장만 모임 정보를 수정할 수 있습니다."
              : legacyMessage.includes("organization_name_taken")
                ? "이미 사용 중인 모임 이름입니다."
                : "모임 비밀번호를 변경하지 못했습니다. 다시 시도해 주세요.",
          },
          legacyMessage.includes("organization_owner_required")
            ? 403
            : legacyMessage.includes("organization_name_taken")
              ? 409
              : 500,
        );
      }

      const { error: nicknameError } = await authenticated.supabase
        .from("organization_memberships")
        .update({ nickname, updated_at: now })
        .eq("organization_id", organizationId)
        .eq("user_id", authenticated.user.id);

      if (nicknameError) {
        return noStoreJson(
          {
            message: `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
          },
          400,
        );
      }

      return noStoreJson({ message: "모임 정보를 수정했습니다." });
    }

    return noStoreJson({ message: "모임 정보를 수정했습니다." });
  }

  const { error: organizationError } = await authenticated.supabase
    .from("organizations")
    .update({
      name,
      normalized_name: normalizedKey,
      description: description || null,
      updated_at: now,
    })
    .eq("id", organizationId)
    .eq("owner_user_id", authenticated.user.id);

  if (organizationError) {
    const nameTaken =
      organizationError.code === "23505" ||
      organizationError.message.toLowerCase().includes("duplicate") ||
      organizationError.message.includes("organizations_normalized_name");
    return noStoreJson(
      {
        message: nameTaken
          ? "이미 사용 중인 모임 이름입니다."
          : "모임 정보를 수정하지 못했습니다. 다시 시도해 주세요.",
      },
      nameTaken ? 409 : 500,
    );
  }

  const { error: nicknameError } = await authenticated.supabase
    .from("organization_memberships")
    .update({ nickname, updated_at: now })
    .eq("organization_id", organizationId)
    .eq("user_id", authenticated.user.id)
    .eq("role", "owner")
    .eq("status", "approved");

  if (nicknameError) {
    return noStoreJson(
      {
        message: `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
      },
      400,
    );
  }

  const { data: approvedMembers, error: membersError } =
    await authenticated.supabase
      .from("organization_memberships")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("status", "approved");

  if (!membersError && approvedMembers && approvedMembers.length > 0) {
    await authenticated.supabase
      .from("user_profile_settings")
      .update({
        affiliation: name,
        updated_at: now,
      })
      .in(
        "user_id",
        approvedMembers.map((member) => member.user_id),
      );
  }

  return noStoreJson({ message: "모임 정보를 수정했습니다." });
}

export async function DELETE(request: Request) {
  const rateLimit = await checkPublicApiRateLimit(
    request,
    "organization-delete",
    5,
    60 * 60,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return noStoreJson({ message: "로그인이 필요합니다." }, 401);
  }

  const { error } = await authenticated.supabase.rpc(
    "delete_owned_organization",
    {
      p_owner_user_id: authenticated.user.id,
    },
  );

  if (error) {
    const ownerRequired = error.message.includes(
      "organization_owner_required",
    );
    return noStoreJson(
      {
        message: ownerRequired
          ? "모임장만 자신이 만든 모임을 삭제할 수 있습니다."
          : "모임을 삭제하지 못했습니다. 다시 시도해 주세요.",
      },
      ownerRequired ? 403 : 500,
    );
  }

  return noStoreJson({
    message: "모임과 모든 가입 관계를 삭제했습니다.",
  });
}
