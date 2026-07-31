begin;

create or replace function public.update_owned_organization(
  p_owner_user_id uuid,
  p_name text,
  p_description text default null,
  p_password text default null,
  p_password_action text default 'keep'
)
returns void
language plpgsql
set search_path = public, extensions
as $$
declare
  owned_organization_id uuid;
  normalized_display_name text;
  normalized_key text;
  normalized_description text;
begin
  normalized_display_name :=
    regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  normalized_key :=
    public.normalize_organization_name(normalized_display_name);
  normalized_description :=
    nullif(
      regexp_replace(btrim(coalesce(p_description, '')), '\s+', ' ', 'g'),
      ''
    );

  if char_length(normalized_display_name) < 1
    or char_length(normalized_display_name) > 50 then
    raise exception 'invalid_organization_name';
  end if;

  if normalized_description is not null
    and char_length(normalized_description) > 300 then
    raise exception 'invalid_organization_description';
  end if;

  if p_password_action not in ('keep', 'set', 'remove') then
    raise exception 'invalid_organization_password_action';
  end if;

  if p_password_action = 'set'
    and (
      p_password is null
      or char_length(p_password) < 4
      or char_length(p_password) > 20
    ) then
    raise exception 'invalid_organization_password';
  end if;

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

  update public.organizations as organization
  set name = normalized_display_name,
      normalized_name = normalized_key,
      description = normalized_description,
      join_password_hash = case p_password_action
        when 'set' then crypt(p_password, gen_salt('bf', 10))
        when 'remove' then null
        else organization.join_password_hash
      end,
      updated_at = now()
  where organization.id = owned_organization_id
    and organization.owner_user_id = p_owner_user_id;

  if not found then
    raise exception 'organization_owner_required';
  end if;

  update public.user_profile_settings as profile
  set affiliation = normalized_display_name,
      updated_at = now()
  where profile.user_id in (
    select membership.user_id
    from public.organization_memberships as membership
    where membership.organization_id = owned_organization_id
      and membership.status = 'approved'
  );
exception
  when unique_violation then
    raise exception 'organization_name_taken';
end;
$$;

revoke all on function public.update_owned_organization(
  uuid,
  text,
  text,
  text,
  text
) from public, anon, authenticated;
grant execute on function public.update_owned_organization(
  uuid,
  text,
  text,
  text,
  text
) to service_role;

commit;
