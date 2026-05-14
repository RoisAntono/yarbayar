-- =============================================================================
-- create_group_with_members
--
-- Atomically creates a group, inserts the owner as a linked member, and
-- inserts any guest members in a single transaction. Runs as SECURITY
-- DEFINER (so it does not depend on per-table RLS policies) but only
-- after explicitly verifying that the caller is authenticated.
--
-- This is the recommended pattern when you want a single user-facing
-- "do all the things" mutation that touches multiple tables. It avoids
-- partial-write bugs (group created but members fail) and removes any
-- ambiguity from stacked RLS policies.
-- =============================================================================

create or replace function public.create_group_with_members(
  _name text,
  _emoji text,
  _owner_display_name text,
  _member_names text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _group_id uuid;
  _member_name text;
begin
  if _uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if _name is null or length(trim(_name)) < 2 then
    raise exception 'group name must be at least 2 characters';
  end if;

  -- Ensure profile exists (covers users who registered before the
  -- handle_new_user trigger was installed)
  insert into public.profiles (id, full_name)
  values (_uid, coalesce(_owner_display_name, 'User'))
  on conflict (id) do nothing;

  -- Create the group
  insert into public.groups (name, emoji, owner_id)
  values (trim(_name), nullif(trim(_emoji), ''), _uid)
  returning id into _group_id;

  -- Owner as a linked member
  insert into public.group_members (group_id, profile_id, display_name)
  values (
    _group_id,
    _uid,
    coalesce(nullif(trim(_owner_display_name), ''), 'Saya')
  );

  -- Guest members (skip empty names)
  if _member_names is not null then
    foreach _member_name in array _member_names loop
      if _member_name is not null and length(trim(_member_name)) > 0 then
        insert into public.group_members (group_id, profile_id, display_name)
        values (_group_id, null, trim(_member_name));
      end if;
    end loop;
  end if;

  return _group_id;
end;
$$;

grant execute on function public.create_group_with_members(text, text, text, text[]) to authenticated;
