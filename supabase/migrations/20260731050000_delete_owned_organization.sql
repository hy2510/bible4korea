begin;

create or replace function public.delete_owned_organization(
  p_owner_user_id uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  owned_organization_id uuid;
begin
  select membership.organization_id
  into owned_organization_id
  from public.organization_memberships as membership
  where membership.user_id = p_owner_user_id
    and membership.role = 'owner'
    and membership.status = 'approved'
  for update;

  if owned_organization_id is null then
    raise exception 'organization_owner_required';
  end if;

  update public.user_profile_settings as profile
  set affiliation = null,
      updated_at = now()
  where profile.user_id in (
    select membership.user_id
    from public.organization_memberships as membership
    where membership.organization_id = owned_organization_id
  );

  delete from public.organizations
  where id = owned_organization_id
    and owner_user_id = p_owner_user_id;

  if not found then
    raise exception 'organization_owner_required';
  end if;
end;
$$;

revoke all on function public.delete_owned_organization(uuid)
  from public, anon, authenticated;
grant execute on function public.delete_owned_organization(uuid)
  to service_role;

commit;
