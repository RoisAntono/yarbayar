-- Owner-as-proxy for settlements involving guest members
--
-- Migration 0004 introduced settlements with strict RLS:
--   - insert: only the debtor (from_member_id's account holder)
--   - update: either side
--   - delete: only the debtor
--
-- That breaks when one (or both) sides of a settlement is a guest
-- (group_members.profile_id IS NULL). Guests have no auth.uid(), so
-- nobody could act on their behalf, leaving rows stuck "pending forever"
-- or impossible to record at all.
--
-- The pragmatic fix Gen-Z trips actually need: the group owner can
-- proxy for any guest. Owner is usually the one who's in the trip-
-- planner role anyway and collects the money in person.
--
-- Members who already have accounts are unaffected — they still
-- self-act and the owner cannot override their actions.

-------------------------------------------------------------------
-- Insert: debtor OR (owner acting for a guest debtor)
-------------------------------------------------------------------

drop policy if exists "debtor can insert settlement" on public.settlements;
drop policy if exists "debtor or owner can insert settlement" on public.settlements;
create policy "debtor or owner can insert settlement"
on public.settlements
for insert
to authenticated
with check (
  -- Self: I'm the debtor and I have an account
  exists (
    select 1 from public.group_members gm
    where gm.id = settlements.from_member_id
      and gm.profile_id = auth.uid()
  )
  OR
  -- Proxy: I'm the group owner and the debtor is a guest
  exists (
    select 1
    from public.groups g
    join public.group_members gm on gm.id = settlements.from_member_id
    where g.id = settlements.group_id
      and g.owner_id = auth.uid()
      and gm.profile_id is null
  )
);

-------------------------------------------------------------------
-- Update (used for confirming): either side OR owner-for-guest
-------------------------------------------------------------------

drop policy if exists "members can update settlement" on public.settlements;
drop policy if exists "members or owner can update settlement" on public.settlements;
create policy "members or owner can update settlement"
on public.settlements
for update
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.id in (settlements.from_member_id, settlements.to_member_id)
      and gm.profile_id = auth.uid()
  )
  OR
  -- Owner can confirm/edit if either side is a guest
  exists (
    select 1
    from public.groups g
    join public.group_members gm
      on gm.id in (settlements.from_member_id, settlements.to_member_id)
    where g.id = settlements.group_id
      and g.owner_id = auth.uid()
      and gm.profile_id is null
  )
);

-------------------------------------------------------------------
-- Delete (withdraw pending settlement): debtor OR owner-for-guest-debtor
-------------------------------------------------------------------

drop policy if exists "debtor can delete settlement" on public.settlements;
drop policy if exists "debtor or owner can delete settlement" on public.settlements;
create policy "debtor or owner can delete settlement"
on public.settlements
for delete
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.id = settlements.from_member_id
      and gm.profile_id = auth.uid()
  )
  OR
  exists (
    select 1
    from public.groups g
    join public.group_members gm on gm.id = settlements.from_member_id
    where g.id = settlements.group_id
      and g.owner_id = auth.uid()
      and gm.profile_id is null
  )
);
