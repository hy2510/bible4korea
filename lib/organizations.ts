export const ORGANIZATION_NAME_MAX_LENGTH = 50;
export const ORGANIZATION_DESCRIPTION_MAX_LENGTH = 300;
export const ORGANIZATION_PASSWORD_MIN_LENGTH = 4;
export const ORGANIZATION_PASSWORD_MAX_LENGTH = 20;
export const ORGANIZATION_SEARCH_PAGE_SIZE = 10;
export const ORGANIZATION_NICKNAME_MAX_LENGTH = 20;

export type OrganizationRole = "owner" | "member";
export type OrganizationMembershipStatus = "pending" | "approved";
export type OrganizationPasswordAction = "keep" | "set" | "remove";

export interface OrganizationMember {
  userId: string;
  username: string;
  displayName: string;
  role: OrganizationRole;
  status: OrganizationMembershipStatus;
  requestedAt: string;
  approvedAt: string | null;
}

export interface MyOrganizationMembership {
  organizationId: string;
  organizationName: string;
  nickname: string;
  description: string | null;
  requiresPassword: boolean;
  role: OrganizationRole;
  status: OrganizationMembershipStatus;
  requestedAt: string;
  approvedAt: string | null;
  members: OrganizationMember[];
}

export interface MyOrganizationResponse {
  membership: MyOrganizationMembership | null;
}

export interface OrganizationSearchItem {
  id: string;
  name: string;
  description: string | null;
  requiresPassword: boolean;
  ownerDisplayName: string | null;
}

export interface OrganizationSearchResponse {
  items: OrganizationSearchItem[];
  page: number;
  hasMore: boolean;
}

export interface OrganizationApprovalNotice {
  organizationId: string;
  organizationName: string;
  approvedAt: string | null;
}

export interface OrganizationApprovalNoticeResponse {
  notice: OrganizationApprovalNotice | null;
}

export function normalizeOrganizationName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidOrganizationName(value: string): boolean {
  const normalized = normalizeOrganizationName(value);
  return (
    normalized.length >= 1 &&
    normalized.length <= ORGANIZATION_NAME_MAX_LENGTH
  );
}

export function normalizeOrganizationDescription(
  value: string,
): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidOrganizationDescription(value: string): boolean {
  return (
    normalizeOrganizationDescription(value).length <=
    ORGANIZATION_DESCRIPTION_MAX_LENGTH
  );
}

export function isValidOrganizationPassword(value: string): boolean {
  return (
    value.length === 0 ||
    (value.length >= ORGANIZATION_PASSWORD_MIN_LENGTH &&
      value.length <= ORGANIZATION_PASSWORD_MAX_LENGTH)
  );
}

export function isOrganizationPasswordAction(
  value: string,
): value is OrganizationPasswordAction {
  return value === "keep" || value === "set" || value === "remove";
}

export function normalizeOrganizationNickname(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidOrganizationNickname(value: string): boolean {
  const normalized = normalizeOrganizationNickname(value);
  return (
    normalized.length >= 1 &&
    normalized.length <= ORGANIZATION_NICKNAME_MAX_LENGTH
  );
}
