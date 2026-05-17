-- ============================================================================
-- Group invites (Splitwise/Tricount-style shareable links)
-- ============================================================================
--
-- Two member roles in a group:
--
--   • Auth member  — has profile_id set; manages own settlements,
--                    confirms own payments.
--   • Guest member — profile_id NULL; owner acts on their behalf
--                    (mark-paid, confirm). See migration 0005.
--
-- This migration introduces the bridge between them: invite tokens.
--
--   • Owner can create an invite for a NEW member  → joiner becomes
--     auth member with their own profile_id.
--   • Owner can create an invite to CLAIM a specific existing guest
--     member  → joiner takes over that guest's identity, history
--     intact.
--
-- Each token is single-use. We deliberately don't expose the user's
-- email at creation time — owner just generates a link, joiner
-- authenticates themselves.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.group_invites (
  token uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  -- When set, the joiner CLAIMS this guest member (we update its
  -- profile_id). When NULL, a fresh auth member row is created.
  invited_member_id uuid references public.group_members(id) on delete cascade,
  -- Hint shown on the join page ("kamu akan masuk sebagai 'Andi'").
  -- For claim-flow, we copy guest's display_name. For new-member
  -- flow, owner can pre-fill or leave blank (user's profile name
  -- will be used).
  display_name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- 24h expiry default — short-lived invites for ad-hoc trips. If
  -- someone needs a fresh link, owner can just regenerate. Long-lived
  -- tokens are an attack surface for ditched group chats / shared
  -- screenshots that leak the URL.
  expires_at timestamptz not null default (now() + interval '24 hours'),
  -- Single-use semantics: once used_at is set, the token can't be
  -- spent again.
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_group_invites_group on public.group_invites(group_id);
create index if not exists idx_group_invites_expires on public.group_invites(expires_at);

-- ----------------------------------------------------------------------------
-- Idempotent column-default fix
-- ----------------------------------------------------------------------------
-- This migration originally shipped with `now() + interval '7 days'`. We
-- shortened that to 24h after deploy. `create table if not exists` is a
-- no-op for the column default once the table exists, so we explicitly
-- set it here. Also normalise any *existing* unused row whose expiry
-- is more than 24h in the future — it was probably created under the
-- old default and the user expects 24h going forward.

alter table public.group_invites
  alter column expires_at set default (now() + interval '24 hours');

update public.group_invites
   set expires_at = now() + interval '24 hours'
 where used_at is null
   and expires_at > now() + interval '24 hours';

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------

alter table public.group_invites enable row level security;

-- Group members can SEE invites of their own group (so the settings
-- page can list pending links). The accept_invite RPC bypasses this
-- entirely (SECURITY DEFINER) to allow non-members to validate a
-- token before joining.
drop policy if exists invites_select on public.group_invites;
create policy invites_select on public.group_invites
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_invites.group_id
        and gm.profile_id = auth.uid()
    )
  );

-- Only the owner can create / delete invites for their group.
drop policy if exists invites_insert on public.group_invites;
create policy invites_insert on public.group_invites
  for insert with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.groups g
      where g.id = group_invites.group_id
        and g.owner_id = auth.uid()
    )
  );

drop policy if exists invites_delete on public.group_invites;
create policy invites_delete on public.group_invites
  for delete using (
    exists (
      select 1 from public.groups g
      where g.id = group_invites.group_id
        and g.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- accept_invite RPC
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER — runs with elevated privileges so the joiner
-- (who isn't yet a group member) can write the rows. We re-verify
-- auth.uid() inside before doing anything.
--
-- Two consumption modes:
--
--   • CLAIM (invited_member_id is set) → SINGLE-USE. Once claimed,
--     the guest seat is occupied; any subsequent accept of the same
--     token must fail. Token's used_at is set on success.
--
--   • OPEN-SEAT (invited_member_id is null) → MULTI-USE until
--     expiry. Owner shares ONE link with friends, each friend
--     authenticates and joins as their own auth member. Token stays
--     valid; we don't set used_at. To "burn" it, owner explicitly
--     revokes.
--
-- This matches Splitwise/Tricount UX: one shareable group link.

create or replace function public.accept_invite(_token uuid)
returns uuid -- group_id
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.group_invites%rowtype;
  uid uuid := auth.uid();
  existing_member_id uuid;
  joiner_name text;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  -- Lock the row so two concurrent accepts on the same token can't
  -- both succeed (only matters for CLAIM mode anyway).
  select * into inv from public.group_invites
   where token = _token
   for update;
  if not found then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;
  -- used_at can only be non-null for claim invites (single-use).
  -- Open-seat invites never get used_at set, so this only blocks
  -- replays of consumed claim links.
  if inv.used_at is not null then
    raise exception 'already_used' using errcode = 'P0001';
  end if;
  if inv.expires_at < now() then
    raise exception 'expired' using errcode = 'P0001';
  end if;

  -- If user is already a member of this group, no-op — joining twice
  -- is fine, just return the group. Don't burn the invite, since the
  -- canonical use case (open-seat) wants others to still join.
  select id into existing_member_id from public.group_members
    where group_id = inv.group_id and profile_id = uid;
  if found then
    return inv.group_id;
  end if;

  if inv.invited_member_id is not null then
    -- CLAIM flow: link existing guest member to this account.
    -- Guard against re-claim if someone else already grabbed it.
    update public.group_members
       set profile_id = uid
     where id = inv.invited_member_id
       and profile_id is null
       and group_id = inv.group_id;
    if not found then
      raise exception 'target_already_claimed' using errcode = 'P0001';
    end if;

    -- Burn the token — claim invites are single-use.
    update public.group_invites
       set used_at = now(), used_by = uid
     where token = _token;
  else
    -- OPEN-SEAT flow. Use invite-supplied display_name first; fall
    -- back to the joiner's profile.full_name; finally fall back to
    -- "Anggota". Display name is mandatory in our schema.
    select coalesce(nullif(inv.display_name, ''), nullif(p.full_name, ''), 'Anggota')
      into joiner_name
      from public.profiles p
     where p.id = uid;
    if joiner_name is null then
      joiner_name := 'Anggota';
    end if;

    insert into public.group_members(group_id, profile_id, display_name)
    values (inv.group_id, uid, joiner_name);

    -- DON'T set used_at — open-seat invites are multi-use until
    -- they expire or owner revokes.
  end if;

  return inv.group_id;
end;
$$;


revoke all on function public.accept_invite(uuid) from public;
grant execute on function public.accept_invite(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- preview_invite RPC
-- ----------------------------------------------------------------------------
-- A read-only RPC that lets the join page show "kamu akan bergabung
-- ke <grup>" before the user authenticates. Returns NULL fields if
-- token is invalid/expired/used so the UI can render appropriately.

create or replace function public.preview_invite(_token uuid)
returns table (
  group_id uuid,
  group_name text,
  group_emoji text,
  invited_display_name text,
  is_claim boolean,
  expires_at timestamptz,
  is_used boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    g.id,
    g.name,
    g.emoji,
    coalesce(inv.display_name, gm.display_name),
    (inv.invited_member_id is not null) as is_claim,
    inv.expires_at,
    (inv.used_at is not null) as is_used
  from public.group_invites inv
  join public.groups g on g.id = inv.group_id
  left join public.group_members gm on gm.id = inv.invited_member_id
  where inv.token = _token;
end;
$$;

revoke all on function public.preview_invite(uuid) from public;
grant execute on function public.preview_invite(uuid) to anon, authenticated;
