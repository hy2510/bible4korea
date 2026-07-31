begin;

create or replace function public.update_organization_membership_nickname(
  p_user_id uuid,
  p_nickname text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  normalized_nickname text;
begin
  normalized_nickname :=
    regexp_replace(btrim(coalesce(p_nickname, '')), '\s+', ' ', 'g');

  if char_length(normalized_nickname) < 1
    or char_length(normalized_nickname) > 20 then
    raise exception 'invalid_organization_nickname';
  end if;

  update public.organization_memberships
  set nickname = normalized_nickname,
      updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'organization_membership_required';
  end if;
end;
$$;

revoke all on function public.update_organization_membership_nickname(
  uuid,
  text
) from public, anon, authenticated;
grant execute on function public.update_organization_membership_nickname(
  uuid,
  text
) to service_role;

commit;
