begin;

alter table public.organization_memberships
  add column if not exists approval_notice_dismissed_at timestamptz;

-- 기존 승인 회원에게 과거 승인 알림이 새로 노출되지 않도록 처리합니다.
update public.organization_memberships
set approval_notice_dismissed_at = coalesce(
  approved_at,
  updated_at,
  now()
)
where status = 'approved'
  and approval_notice_dismissed_at is null;

comment on column public.organization_memberships.approval_notice_dismissed_at is
  'When set, the member has dismissed the organization approval notice.';

create or replace function public.get_organization_approval_notice(
  p_user_id uuid
)
returns table (
  organization_id uuid,
  organization_name text,
  approved_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    membership.organization_id,
    organization.name,
    membership.approved_at
  from public.organization_memberships as membership
  join public.organizations as organization
    on organization.id = membership.organization_id
  where membership.user_id = p_user_id
    and membership.role = 'member'
    and membership.status = 'approved'
    and membership.approval_notice_dismissed_at is null
  limit 1;
$$;

create or replace function public.dismiss_organization_approval_notice(
  p_user_id uuid
)
returns void
language sql
set search_path = public
as $$
  update public.organization_memberships
  set approval_notice_dismissed_at = now(),
      updated_at = now()
  where user_id = p_user_id
    and role = 'member'
    and status = 'approved'
    and approval_notice_dismissed_at is null;
$$;

revoke all on function public.get_organization_approval_notice(uuid)
  from public, anon, authenticated;
revoke all on function public.dismiss_organization_approval_notice(uuid)
  from public, anon, authenticated;

grant execute on function public.get_organization_approval_notice(uuid)
  to service_role;
grant execute on function public.dismiss_organization_approval_notice(uuid)
  to service_role;

commit;
