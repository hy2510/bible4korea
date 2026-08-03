"use client";

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { useOrganizationPendingRequests } from "@/components/OrganizationPendingRequestsProvider";
import {
  isValidOrganizationDescription,
  isValidOrganizationNickname,
  isValidOrganizationPassword,
  normalizeOrganizationName,
  normalizeOrganizationNickname,
  ORGANIZATION_DESCRIPTION_MAX_LENGTH,
  ORGANIZATION_NAME_MAX_LENGTH,
  ORGANIZATION_NICKNAME_MAX_LENGTH,
  ORGANIZATION_PASSWORD_MAX_LENGTH,
  ORGANIZATION_PASSWORD_MIN_LENGTH,
  type MyOrganizationMembership,
  type MyOrganizationResponse,
  type OrganizationMember,
  type OrganizationPasswordAction,
  type OrganizationSearchItem,
  type OrganizationSearchResponse,
} from "@/lib/organizations";

export type OrganizationSetupModalMode = "search" | "create";
type MemberAction = "approve" | "reject" | "remove";
interface OrganizationUpdateInput {
  name: string;
  nickname: string;
  description: string;
  password: string;
  passwordConfirmation: string;
  passwordAction: OrganizationPasswordAction;
}

const fieldClassName =
  "min-h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground outline-none transition-colors placeholder:text-stone-400 focus:border-amber-700 focus:ring-2 focus:ring-amber-700/15";
const primaryButtonClassName =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60";
const secondaryButtonClassName =
  "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:border-amber-700 hover:text-amber-800 disabled:cursor-wait disabled:opacity-60 dark:hover:text-amber-300";

async function readMessage(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return data?.message ?? fallback;
}

export function AffiliationSettings({
  initialSetupModalMode = null,
}: {
  initialSetupModalMode?: OrganizationSetupModalMode | null;
}) {
  const { refreshPendingCount } = useOrganizationPendingRequests();
  const [membership, setMembership] =
    useState<MyOrganizationMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [setupModalMode, setSetupModalMode] =
    useState<OrganizationSetupModalMode | null>(
      initialSetupModalMode,
    );
  const [createName, setCreateName] = useState("");
  const [createNickname, setCreateNickname] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPasswordConfirmation, setCreatePasswordConfirmation] =
    useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [joinPasswords, setJoinPasswords] = useState<
    Record<string, string>
  >({});
  const [joinNicknames, setJoinNicknames] = useState<
    Record<string, string>
  >({});
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    OrganizationSearchItem[]
  >([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadMembership = useCallback(async (signal?: AbortSignal) => {
    const response = await authenticatedFetch("/api/organizations", {
      cache: "no-store",
      signal,
    });
    const data = (await response.json().catch(() => null)) as
      | MyOrganizationResponse
      | { message?: string }
      | null;
    if (!response.ok) {
      throw new Error(
        data && "message" in data && data.message
          ? data.message
          : "모임 정보를 불러오지 못했습니다.",
      );
    }
    setMembership((data as MyOrganizationResponse).membership);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      try {
        await loadMembership(controller.signal);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "모임 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    });

    return () => controller.abort();
  }, [loadMembership]);

  const refreshMembership = async () => {
    setError("");
    await Promise.all([loadMembership(), refreshPendingCount()]);
  };

  const createOrganization = async () => {
    const name = normalizeOrganizationName(createName);
    const nickname = normalizeOrganizationNickname(createNickname);
    if (!name) {
      setError("모임 이름을 입력해 주세요.");
      return;
    }
    if (!isValidOrganizationNickname(nickname)) {
      setError(
        `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }
    if (!isValidOrganizationDescription(createDescription)) {
      setError(
        `모임 설명은 ${ORGANIZATION_DESCRIPTION_MAX_LENGTH}자 이내로 입력해 주세요.`,
      );
      return;
    }
    if (!isValidOrganizationPassword(createPassword)) {
      setError(
        `모임 비밀번호는 설정하지 않거나 ${ORGANIZATION_PASSWORD_MIN_LENGTH}~${ORGANIZATION_PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }
    if (createPassword !== createPasswordConfirmation) {
      setError("모임 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setPendingAction("create");
    setError("");
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/organizations", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nickname,
          description: createDescription,
          password: createPassword,
          passwordConfirmation: createPasswordConfirmation,
        }),
      });
      const responseMessage = await readMessage(
        response,
        "모임을 만들지 못했습니다.",
      );
      if (!response.ok) throw new Error(responseMessage);
      setCreateName("");
      setCreateNickname("");
      setCreateDescription("");
      setCreatePassword("");
      setCreatePasswordConfirmation("");
      setMessage(responseMessage);
      await refreshMembership();
      setSetupModalMode(null);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "모임을 만들지 못했습니다.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const searchOrganizations = async (
    query: string,
    page: number,
  ) => {
    const normalizedQuery = normalizeOrganizationName(query);
    if (!normalizedQuery) {
      setError("검색할 모임 이름을 입력해 주세요.");
      return;
    }

    setSearching(true);
    setError("");
    try {
      const params = new URLSearchParams({
        query: normalizedQuery,
        page: String(page),
      });
      const response = await authenticatedFetch(
        `/api/organizations/search?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = (await response.json().catch(() => null)) as
        | OrganizationSearchResponse
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          data && "message" in data && data.message
            ? data.message
            : "모임을 검색하지 못했습니다.",
        );
      }

      const results = data as OrganizationSearchResponse;
      setActiveSearchQuery(normalizedQuery);
      setSearchResults(results.items);
      setSearchPage(results.page);
      setSearchHasMore(results.hasMore);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "모임을 검색하지 못했습니다.",
      );
    } finally {
      setSearching(false);
    }
  };

  const requestMembership = async (organization: OrganizationSearchItem) => {
    const nickname = normalizeOrganizationNickname(
      joinNicknames[organization.id] ?? "",
    );
    if (!isValidOrganizationNickname(nickname)) {
      setError(
        `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }

    const password = joinPasswords[organization.id] ?? "";
    if (
      organization.requiresPassword &&
      (!password || !isValidOrganizationPassword(password))
    ) {
      setError(
        `모임 비밀번호는 ${ORGANIZATION_PASSWORD_MIN_LENGTH}~${ORGANIZATION_PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }

    setPendingAction(`join:${organization.id}`);
    setError("");
    setMessage("");
    try {
      const response = await authenticatedFetch(
        `/api/organizations/${organization.id}/join`,
        {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname, password }),
        },
      );
      const responseMessage = await readMessage(
        response,
        "가입을 요청하지 못했습니다.",
      );
      if (!response.ok) throw new Error(responseMessage);
      setJoinPasswords((current) => ({
        ...current,
        [organization.id]: "",
      }));
      setJoinNicknames((current) => ({
        ...current,
        [organization.id]: "",
      }));
      setMessage(responseMessage);
      await refreshMembership();
      setSetupModalMode(null);
    } catch (joinError) {
      setError(
        joinError instanceof Error
          ? joinError.message
          : "가입을 요청하지 못했습니다.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const leaveOrganization = async () => {
    if (
      membership?.status === "approved" &&
      !window.confirm("이 모임에서 탈퇴하시겠습니까?")
    ) {
      return;
    }

    setPendingAction("leave");
    setError("");
    setMessage("");
    try {
      const response = await authenticatedFetch(
        "/api/organizations/membership",
        { method: "DELETE", cache: "no-store" },
      );
      const responseMessage = await readMessage(
        response,
        "모임 상태를 해제하지 못했습니다.",
      );
      if (!response.ok) throw new Error(responseMessage);
      setMessage(responseMessage);
      await refreshMembership();
    } catch (leaveError) {
      setError(
        leaveError instanceof Error
          ? leaveError.message
          : "모임 상태를 해제하지 못했습니다.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const deleteOrganization = async () => {
    if (
      !membership ||
      membership.role !== "owner" ||
      !window.confirm(
        `"${membership.organizationName}" 모임을 삭제하시겠습니까?\n모든 회원의 가입 관계가 함께 삭제되며 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    setPendingAction("delete-organization");
    setError("");
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/organizations", {
        method: "DELETE",
        cache: "no-store",
      });
      const responseMessage = await readMessage(
        response,
        "모임을 삭제하지 못했습니다.",
      );
      if (!response.ok) throw new Error(responseMessage);
      setMessage(responseMessage);
      await refreshMembership();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "모임을 삭제하지 못했습니다.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const updateOrganization = async (
    input: OrganizationUpdateInput,
  ): Promise<boolean> => {
    setPendingAction("update-organization");
    setError("");
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/organizations", {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const responseMessage = await readMessage(
        response,
        "모임 정보를 수정하지 못했습니다.",
      );
      if (!response.ok) throw new Error(responseMessage);
      setMessage(responseMessage);
      try {
        await refreshMembership();
      } catch {
        // 저장은 완료됐으므로 새로고침 실패만으로 실패 처리하지 않습니다.
      }
      return true;
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "모임 정보를 수정하지 못했습니다.",
      );
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  const updateMembershipNickname = async (
    nickname: string,
  ): Promise<boolean> => {
    setPendingAction("update-membership-nickname");
    setError("");
    setMessage("");
    try {
      const response = await authenticatedFetch(
        "/api/organizations/membership",
        {
          method: "PATCH",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname }),
        },
      );
      const responseMessage = await readMessage(
        response,
        "별명을 변경하지 못했습니다.",
      );
      if (!response.ok) throw new Error(responseMessage);
      setMessage(responseMessage);
      try {
        await refreshMembership();
      } catch {
        // 저장은 완료됐으므로 새로고침 실패만으로 실패 처리하지 않습니다.
      }
      return true;
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "별명을 변경하지 못했습니다.",
      );
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  const reviewMember = async (
    member: OrganizationMember,
    action: MemberAction,
  ) => {
    if (
      action === "remove" &&
      !window.confirm(
        `${member.displayName}님을 모임에서 삭제하시겠습니까?\n삭제하면 해당 회원의 모임 가입이 해제되며 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    setPendingAction(`${action}:${member.userId}`);
    setError("");
    setMessage("");
    try {
      const response = await authenticatedFetch(
        `/api/organizations/members/${member.userId}`,
        {
          method: "PATCH",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      const responseMessage = await readMessage(
        response,
        "회원을 처리하지 못했습니다.",
      );
      if (!response.ok) throw new Error(responseMessage);
      setMessage(responseMessage);
      await refreshMembership();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "회원을 처리하지 못했습니다.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-border bg-surface p-5 sm:p-7"
        aria-label="모임 정보를 불러오는 중"
      >
        <div className="h-28 animate-pulse rounded-xl bg-surface-muted" />
      </section>
    );
  }

  return (
    <section
      aria-label="모임 정보"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-7"
    >
      <p className="text-sm leading-relaxed text-muted">
        모임을 만들거나 기존 모임을 검색해 가입할 수 있습니다. 가입 요청은
        모임장의 승인이 필요하며, 별명은 이 모임 안에서만 사용됩니다.
      </p>

      {membership ? (
        <MembershipPanel
          membership={membership}
          pendingAction={pendingAction}
          onLeave={() => void leaveOrganization()}
          onDelete={() => void deleteOrganization()}
          onUpdate={updateOrganization}
          onUpdateNickname={updateMembershipNickname}
          onReview={(member, action) =>
            void reviewMember(member, action)
          }
        />
      ) : (
        <div className="mt-6">
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center">
            <p className="text-sm font-semibold text-foreground">
              현재 가입한 모임이 없습니다.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              모임을 검색해 가입을 요청하거나 새 모임을 만들어 보세요.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
                setSetupModalMode("search");
              }}
              className="cursor-pointer text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-amber-800 hover:underline dark:hover:text-amber-300"
            >
              모임 검색
            </button>
            <span aria-hidden className="text-xs text-border">
              ·
            </span>
            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
                setSetupModalMode("create");
              }}
              className="cursor-pointer text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-amber-800 hover:underline dark:hover:text-amber-300"
            >
              모임 만들기
            </button>
          </div>

          {setupModalMode && (
            <OrganizationSetupModal
              mode={setupModalMode}
              busy={searching || pendingAction !== null}
              onClose={() => {
                setError("");
                setSetupModalMode(null);
              }}
            >
          {setupModalMode === "search" ? (
            <div>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void searchOrganizations(searchQuery, 1);
                }}
              >
                <label htmlFor="organization-search" className="sr-only">
                  모임 이름 검색
                </label>
                <input
                  id="organization-search"
                  type="search"
                  autoFocus
                  maxLength={ORGANIZATION_NAME_MAX_LENGTH}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="모임 이름을 입력하세요"
                  className={fieldClassName}
                />
                <button
                  type="submit"
                  disabled={searching}
                  className={`${primaryButtonClassName} shrink-0`}
                >
                  {searching ? "검색 중…" : "검색"}
                </button>
              </form>

              {!searching &&
                activeSearchQuery &&
                searchResults.length === 0 && (
                  <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted">
                    검색된 모임이 없습니다.
                  </p>
                )}

              {searchResults.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {searchResults.map((organization) => (
                    <li
                      key={organization.id}
                      className="rounded-xl border border-border px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {organization.name}
                          </span>
                          {organization.ownerDisplayName && (
                            <span className="mt-1 block truncate text-xs text-muted">
                              모임장 · {organization.ownerDisplayName}
                            </span>
                          )}
                          {organization.description && (
                            <span className="mt-1 block text-xs leading-5 text-muted">
                              {organization.description}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          disabled={pendingAction !== null}
                          onClick={() =>
                            void requestMembership(organization)
                          }
                          className={`${secondaryButtonClassName} shrink-0`}
                        >
                          {pendingAction === `join:${organization.id}`
                            ? "요청 중…"
                            : "가입 요청"}
                        </button>
                      </div>
                      <div className="mt-3">
                        <label
                          htmlFor={`organization-nickname-${organization.id}`}
                          className="mb-1.5 block text-xs font-semibold text-foreground"
                        >
                          이 모임에서 사용할 별명
                        </label>
                        <input
                          id={`organization-nickname-${organization.id}`}
                          maxLength={ORGANIZATION_NICKNAME_MAX_LENGTH}
                          value={joinNicknames[organization.id] ?? ""}
                          onChange={(event) =>
                            setJoinNicknames((current) => ({
                              ...current,
                              [organization.id]: event.target.value,
                            }))
                          }
                          placeholder={`1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자`}
                          className={fieldClassName}
                        />
                      </div>
                      {organization.requiresPassword && (
                        <div className="mt-3">
                          <label
                            htmlFor={`organization-password-${organization.id}`}
                            className="mb-1.5 block text-xs font-semibold text-foreground"
                          >
                            모임 비밀번호
                          </label>
                          <input
                            id={`organization-password-${organization.id}`}
                            type="password"
                            autoComplete="off"
                            minLength={ORGANIZATION_PASSWORD_MIN_LENGTH}
                            maxLength={ORGANIZATION_PASSWORD_MAX_LENGTH}
                            value={joinPasswords[organization.id] ?? ""}
                            onChange={(event) =>
                              setJoinPasswords((current) => ({
                                ...current,
                                [organization.id]: event.target.value,
                              }))
                            }
                            placeholder={`${ORGANIZATION_PASSWORD_MIN_LENGTH}~${ORGANIZATION_PASSWORD_MAX_LENGTH}자`}
                            className={fieldClassName}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {activeSearchQuery &&
                (searchPage > 1 || searchHasMore) && (
                  <nav
                    aria-label="모임 검색 결과 페이지"
                    className="mt-4 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      disabled={searching || searchPage <= 1}
                      onClick={() =>
                        void searchOrganizations(
                          activeSearchQuery,
                          searchPage - 1,
                        )
                      }
                      className={secondaryButtonClassName}
                    >
                      이전
                    </button>
                    <span className="text-xs text-muted">
                      {searchPage}페이지
                    </span>
                    <button
                      type="button"
                      disabled={searching || !searchHasMore}
                      onClick={() =>
                        void searchOrganizations(
                          activeSearchQuery,
                          searchPage + 1,
                        )
                      }
                      className={secondaryButtonClassName}
                    >
                      다음
                    </button>
                  </nav>
                )}
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void createOrganization();
              }}
            >
              <label
                htmlFor="organization-create-name"
                className="mb-2 block text-sm font-semibold text-foreground"
              >
                새 모임 이름
              </label>
              <input
                id="organization-create-name"
                autoFocus
                maxLength={ORGANIZATION_NAME_MAX_LENGTH}
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="예: ○○교회 청년부"
                className={fieldClassName}
              />
              <label
                htmlFor="organization-create-nickname"
                className="mt-5 mb-2 block text-sm font-semibold text-foreground"
              >
                이 모임에서 사용할 별명
              </label>
              <input
                id="organization-create-nickname"
                maxLength={ORGANIZATION_NICKNAME_MAX_LENGTH}
                value={createNickname}
                onChange={(event) =>
                  setCreateNickname(event.target.value)
                }
                placeholder={`1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자`}
                className={fieldClassName}
              />
              <label
                htmlFor="organization-create-description"
                className="mt-5 mb-2 block text-sm font-semibold text-foreground"
              >
                모임 설명{" "}
                <span className="font-normal text-muted">(선택)</span>
              </label>
              <textarea
                id="organization-create-description"
                maxLength={ORGANIZATION_DESCRIPTION_MAX_LENGTH}
                value={createDescription}
                onChange={(event) =>
                  setCreateDescription(event.target.value)
                }
                placeholder="모임을 알아볼 수 있는 간단한 설명"
                rows={3}
                className={`${fieldClassName} py-3`}
              />
              <p className="mt-1 text-right text-xs text-muted">
                {createDescription.length}/
                {ORGANIZATION_DESCRIPTION_MAX_LENGTH}
              </p>
              <label
                htmlFor="organization-create-password"
                className="mt-5 mb-2 block text-sm font-semibold text-foreground"
              >
                모임 비밀번호{" "}
                <span className="font-normal text-muted">(선택)</span>
              </label>
              <input
                id="organization-create-password"
                type="password"
                autoComplete="new-password"
                minLength={ORGANIZATION_PASSWORD_MIN_LENGTH}
                maxLength={ORGANIZATION_PASSWORD_MAX_LENGTH}
                value={createPassword}
                onChange={(event) =>
                  setCreatePassword(event.target.value)
                }
                placeholder={`설정 시 ${ORGANIZATION_PASSWORD_MIN_LENGTH}~${ORGANIZATION_PASSWORD_MAX_LENGTH}자`}
                className={fieldClassName}
              />
              <label
                htmlFor="organization-create-password-confirmation"
                className="mt-4 mb-2 block text-sm font-semibold text-foreground"
              >
                모임 비밀번호 확인
              </label>
              <input
                id="organization-create-password-confirmation"
                type="password"
                autoComplete="new-password"
                minLength={ORGANIZATION_PASSWORD_MIN_LENGTH}
                maxLength={ORGANIZATION_PASSWORD_MAX_LENGTH}
                value={createPasswordConfirmation}
                onChange={(event) =>
                  setCreatePasswordConfirmation(event.target.value)
                }
                placeholder="모임 비밀번호를 다시 입력하세요"
                className={fieldClassName}
              />
              <p className="mt-2 text-xs leading-5 text-muted">
                비밀번호를 설정하면 가입 요청 전에 비밀번호 확인이 필요합니다.
                비밀번호 원문은 저장하지 않습니다.
              </p>
              <button
                type="submit"
                disabled={pendingAction !== null}
                className={`${primaryButtonClassName} mt-5 w-full`}
              >
                {pendingAction === "create"
                  ? "만드는 중…"
                  : "모임 만들기"}
              </button>
            </form>
          )}
              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                >
                  {error}
                </p>
              )}
            </OrganizationSetupModal>
          )}
        </div>
      )}

      {message && !setupModalMode && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {message}
        </p>
      )}
      {error && !setupModalMode && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {error}
        </p>
      )}
    </section>
  );
}

function OrganizationSetupModal({
  mode,
  busy,
  onClose,
  children,
}: {
  mode: OrganizationSetupModalMode;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const title = mode === "search" ? "모임 검색" : "모임 만들기";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,46rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="font-serif text-lg font-bold text-foreground"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {mode === "search"
                ? "가입할 모임을 찾고 모임에서 사용할 별명을 입력하세요."
                : "새 모임의 정보와 모임에서 사용할 별명을 입력하세요."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label={`${title} 닫기`}
            className="-mr-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-wait disabled:opacity-60"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function MembershipPanel({
  membership,
  pendingAction,
  onLeave,
  onDelete,
  onUpdate,
  onUpdateNickname,
  onReview,
}: {
  membership: MyOrganizationMembership;
  pendingAction: string | null;
  onLeave: () => void;
  onDelete: () => void;
  onUpdate: (input: OrganizationUpdateInput) => Promise<boolean>;
  onUpdateNickname: (nickname: string) => Promise<boolean>;
  onReview: (member: OrganizationMember, action: MemberAction) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const pendingMembers = membership.members.filter(
    (member) => member.status === "pending",
  );
  const approvedMembers = membership.members.filter(
    (member) => member.status === "approved",
  );

  return (
    <div className="mt-6">
      <div className="rounded-xl border border-border bg-background px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {membership.organizationName}
            </p>
            <p className="mt-1 text-xs text-muted">
              {membership.role === "owner"
                ? "모임장"
                : membership.status === "pending"
                  ? "가입 승인 대기 중"
                  : "가입 회원"}
              {` · ${membership.nickname}`}
              {membership.requiresPassword ? " · 비밀번호 사용" : ""}
            </p>
            {membership.description && (
              <p className="mt-2 text-sm leading-6 text-muted">
                {membership.description}
              </p>
            )}
          </div>
          {membership.role === "owner" ? (
            <div className="flex shrink-0 items-center gap-3">
              {!editingNickname && (
                <button
                  type="button"
                  disabled={pendingAction !== null}
                  onClick={() => {
                    setEditing(false);
                    setEditingNickname(true);
                  }}
                  className="cursor-pointer text-xs font-semibold text-amber-800 disabled:cursor-wait disabled:opacity-60 dark:text-amber-300"
                >
                  별명 수정
                </button>
              )}
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={() => {
                  setEditingNickname(false);
                  setEditing((current) => !current);
                }}
                className="shrink-0 cursor-pointer text-xs font-semibold text-amber-800 disabled:cursor-wait disabled:opacity-60 dark:text-amber-300"
              >
                {editing ? "수정 취소" : "정보 수정"}
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-3">
              {!editingNickname && (
                <button
                  type="button"
                  disabled={pendingAction !== null}
                  onClick={() => setEditingNickname(true)}
                  className="cursor-pointer text-xs font-semibold text-amber-800 disabled:cursor-wait disabled:opacity-60 dark:text-amber-300"
                >
                  별명 수정
                </button>
              )}
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={onLeave}
                className="cursor-pointer text-xs font-semibold text-rose-600 disabled:cursor-wait disabled:opacity-60 dark:text-rose-400"
              >
                {pendingAction === "leave"
                  ? "처리 중…"
                  : membership.status === "pending"
                    ? "요청 취소"
                    : "모임 탈퇴"}
              </button>
            </div>
          )}
        </div>
      </div>

      {membership.role === "owner" && editing && (
        <OrganizationEditForm
          key={`${membership.organizationName}:${membership.nickname}:${membership.description ?? ""}:${membership.requiresPassword}`}
          membership={membership}
          pendingAction={pendingAction}
          onCancel={() => setEditing(false)}
          onDelete={onDelete}
          onSave={async (input) => {
            const saved = await onUpdate(input);
            if (saved) setEditing(false);
          }}
        />
      )}

      {editingNickname && (
        <MembershipNicknameEditForm
          key={membership.nickname}
          nickname={membership.nickname}
          pendingAction={pendingAction}
          onCancel={() => setEditingNickname(false)}
          onSave={async (nickname) => {
            const saved = await onUpdateNickname(nickname);
            if (saved) setEditingNickname(false);
          }}
        />
      )}

      {membership.status === "approved" && (
        <div className="mt-6 space-y-6">
          {membership.role === "owner" && (
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                가입 요청
                <span className="ml-1 text-xs font-medium text-muted">
                  {pendingMembers.length}
                </span>
              </h3>
              {pendingMembers.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
                  대기 중인 가입 요청이 없습니다.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {pendingMembers.map((member) => (
                    <li
                      key={member.userId}
                      className="flex items-center gap-3 rounded-xl border border-border px-3 py-3"
                    >
                      <MemberIdentity member={member} />
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => onReview(member, "approve")}
                        className="cursor-pointer text-xs font-semibold text-emerald-700 disabled:cursor-wait disabled:opacity-60 dark:text-emerald-400"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={pendingAction !== null}
                        onClick={() => onReview(member, "reject")}
                        className="cursor-pointer text-xs font-semibold text-rose-600 disabled:cursor-wait disabled:opacity-60 dark:text-rose-400"
                      >
                        거절
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              모임 회원
              <span className="ml-1 text-xs font-medium text-muted">
                {approvedMembers.length}
              </span>
            </h3>
            <ul className="mt-3 space-y-2">
              {approvedMembers.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-3"
                >
                  <MemberIdentity member={member} />
                  {member.role === "owner" ? (
                    <span className="shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      모임장
                    </span>
                  ) : membership.role === "owner" ? (
                    <button
                      type="button"
                      disabled={pendingAction !== null}
                      onClick={() => onReview(member, "remove")}
                      className="shrink-0 cursor-pointer text-xs font-semibold text-rose-600 disabled:cursor-wait disabled:opacity-60 dark:text-rose-400"
                    >
                      삭제
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function OrganizationEditForm({
  membership,
  pendingAction,
  onCancel,
  onDelete,
  onSave,
}: {
  membership: MyOrganizationMembership;
  pendingAction: string | null;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (input: OrganizationUpdateInput) => Promise<void>;
}) {
  const [name, setName] = useState(membership.organizationName);
  const [description, setDescription] = useState(
    membership.description ?? "",
  );
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [validationError, setValidationError] = useState("");
  const pending = pendingAction !== null;
  const saving = pendingAction === "update-organization";
  const deleting = pendingAction === "delete-organization";

  const submit = async () => {
    const normalizedName = normalizeOrganizationName(name);
    if (!normalizedName) {
      setValidationError("모임 이름을 입력해 주세요.");
      return;
    }
    if (!isValidOrganizationDescription(description)) {
      setValidationError(
        `모임 설명은 ${ORGANIZATION_DESCRIPTION_MAX_LENGTH}자 이내로 입력해 주세요.`,
      );
      return;
    }
    if (
      !removePassword &&
      password &&
      !isValidOrganizationPassword(password)
    ) {
      setValidationError(
        `새 모임 비밀번호는 ${ORGANIZATION_PASSWORD_MIN_LENGTH}~${ORGANIZATION_PASSWORD_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }
    if (!removePassword && password !== passwordConfirmation) {
      setValidationError("새 모임 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setValidationError("");
    await onSave({
      name: normalizedName,
      nickname: membership.nickname,
      description,
      password: removePassword ? "" : password,
      passwordConfirmation: removePassword
        ? ""
        : passwordConfirmation,
      passwordAction: removePassword
        ? "remove"
        : password
          ? "set"
          : "keep",
    });
  };

  return (
    <form
      className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h3 className="text-sm font-semibold text-foreground">
        모임 정보 수정
      </h3>

      <label
        htmlFor="organization-edit-name"
        className="mt-4 mb-2 block text-sm font-semibold text-foreground"
      >
        모임 이름
      </label>
      <input
        id="organization-edit-name"
        maxLength={ORGANIZATION_NAME_MAX_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={fieldClassName}
      />

      <label
        htmlFor="organization-edit-description"
        className="mt-4 mb-2 block text-sm font-semibold text-foreground"
      >
        모임 설명 <span className="font-normal text-muted">(선택)</span>
      </label>
      <textarea
        id="organization-edit-description"
        maxLength={ORGANIZATION_DESCRIPTION_MAX_LENGTH}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={3}
        className={`${fieldClassName} py-3`}
      />
      <p className="mt-1 text-right text-xs text-muted">
        {description.length}/{ORGANIZATION_DESCRIPTION_MAX_LENGTH}
      </p>

      <label
        htmlFor="organization-edit-password"
        className="mt-4 mb-2 block text-sm font-semibold text-foreground"
      >
        새 모임 비밀번호{" "}
        <span className="font-normal text-muted">(선택)</span>
      </label>
      <input
        id="organization-edit-password"
        type="password"
        autoComplete="new-password"
        minLength={ORGANIZATION_PASSWORD_MIN_LENGTH}
        maxLength={ORGANIZATION_PASSWORD_MAX_LENGTH}
        value={password}
        disabled={removePassword}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="비워두면 현재 비밀번호를 유지합니다"
        className={fieldClassName}
      />

      <label
        htmlFor="organization-edit-password-confirmation"
        className="mt-4 mb-2 block text-sm font-semibold text-foreground"
      >
        새 모임 비밀번호 확인
      </label>
      <input
        id="organization-edit-password-confirmation"
        type="password"
        autoComplete="new-password"
        minLength={ORGANIZATION_PASSWORD_MIN_LENGTH}
        maxLength={ORGANIZATION_PASSWORD_MAX_LENGTH}
        value={passwordConfirmation}
        disabled={removePassword}
        onChange={(event) =>
          setPasswordConfirmation(event.target.value)
        }
        placeholder="새 비밀번호를 다시 입력하세요"
        className={fieldClassName}
      />

      {membership.requiresPassword && (
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={removePassword}
            onChange={(event) => {
              setRemovePassword(event.target.checked);
              if (event.target.checked) {
                setPassword("");
                setPasswordConfirmation("");
              }
            }}
            className="size-4 accent-amber-800"
          />
          기존 모임 비밀번호 해제
        </label>
      )}

      {validationError && (
        <p role="alert" className="mt-4 text-sm text-rose-700 dark:text-rose-300">
          {validationError}
        </p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className={`${secondaryButtonClassName} flex-1`}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClassName} flex-1`}
        >
          {saving ? "저장 중…" : "변경 저장"}
        </button>
      </div>

      <div className="mt-6 border-t border-rose-200 pt-5 dark:border-rose-900/60">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          내가 만든 모임 삭제
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          삭제하면 모든 회원의 가입 관계도 함께 삭제되며 되돌릴 수
          없습니다.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="mt-3 cursor-pointer text-xs font-semibold text-rose-600 underline-offset-4 transition-colors hover:underline disabled:cursor-wait disabled:opacity-60 dark:text-rose-400"
        >
          {deleting ? "모임 삭제 중…" : "모임 삭제"}
        </button>
      </div>
    </form>
  );
}

function MembershipNicknameEditForm({
  nickname: initialNickname,
  pendingAction,
  onCancel,
  onSave,
}: {
  nickname: string;
  pendingAction: string | null;
  onCancel: () => void;
  onSave: (nickname: string) => Promise<void>;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [validationError, setValidationError] = useState("");
  const pending = pendingAction !== null;
  const saving = pendingAction === "update-membership-nickname";

  const submit = async () => {
    const normalizedNickname = normalizeOrganizationNickname(nickname);
    if (!isValidOrganizationNickname(normalizedNickname)) {
      setValidationError(
        `별명은 1~${ORGANIZATION_NICKNAME_MAX_LENGTH}자로 입력해 주세요.`,
      );
      return;
    }

    setValidationError("");
    await onSave(normalizedNickname);
  };

  return (
    <form
      className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label
        htmlFor="organization-membership-nickname"
        className="mb-2 block text-sm font-semibold text-foreground"
      >
        내 별명
      </label>
      <input
        id="organization-membership-nickname"
        maxLength={ORGANIZATION_NICKNAME_MAX_LENGTH}
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        className={fieldClassName}
      />

      {validationError && (
        <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">
          {validationError}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          className={`${secondaryButtonClassName} flex-1`}
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClassName} flex-1`}
        >
          {saving ? "저장 중…" : "별명 저장"}
        </button>
      </div>
    </form>
  );
}

function MemberIdentity({ member }: { member: OrganizationMember }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-foreground">
        {member.displayName}
      </span>
      <span className="mt-0.5 block truncate text-xs text-muted">
        {member.username}
      </span>
    </span>
  );
}
