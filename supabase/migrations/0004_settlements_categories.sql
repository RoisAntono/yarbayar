-- Settlements & expense categories
-- Adds the social-payback flow Gen-Z trips need: one user marks they
-- paid back another, the recipient confirms, and the math updates.
-- Also adds a `category` column on expenses for grouping by purpose
-- (Bensin, Makan, Penginapan, …).

-------------------------------------------------------------------
-- 1) Categories on expenses
-------------------------------------------------------------------

alter table public.expenses
  add column if not exists category text;

create index if not exists expenses_group_category_idx
  on public.expenses (group_id, category);

-------------------------------------------------------------------
-- 2) Settlements table — payback records between members
-------------------------------------------------------------------

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,

  -- Both endpoints reference group_members so we can record paybacks
  -- involving guest (non-account) participants too.
  from_member_id uuid not null references public.group_members(id) on delete cascade,
  to_member_id   uuid not null references public.group_members(id) on delete cascade,

  amount numeric(14, 2) not null check (amount > 0),
  note text,

  -- Two-phase status:
  --   paid_at      → debtor says "I sent the money" (creates the row)
  --   confirmed_at → creditor acknowledges receipt
  -- Until confirmed, balances should still treat this as outstanding.
  paid_at      timestamptz not null default now(),
  confirmed_at timestamptz,

  -- Audit
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint settlements_distinct_members check (from_member_id <> to_member_id)
);

create index if not exists settlements_group_idx
  on public.settlements (group_id, paid_at desc);

-------------------------------------------------------------------
-- 3) RLS — same model as expenses: visible if you're a member of the
--    referenced group, mutable only by the actor on the right side.
-------------------------------------------------------------------

alter table public.settlements enable row level security;

drop policy if exists "members can read settlements" on public.settlements;
create policy "members can read settlements"
on public.settlements
for select
to authenticated
using (
  exists (
    select 1
    from public.group_members gm
    where gm.group_id = settlements.group_id
      and gm.profile_id = auth.uid()
  )
);

-- Only the debtor (from_member's account holder) can record a payment
drop policy if exists "debtor can insert settlement" on public.settlements;
create policy "debtor can insert settlement"
on public.settlements
for insert
to authenticated
with check (
  exists (
    select 1 from public.group_members gm
    where gm.id = settlements.from_member_id
      and gm.profile_id = auth.uid()
  )
);

-- Either side can update (debtor can edit their note, creditor can confirm)
drop policy if exists "members can update settlement" on public.settlements;
create policy "members can update settlement"
on public.settlements
for update
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.id in (settlements.from_member_id, settlements.to_member_id)
      and gm.profile_id = auth.uid()
  )
);

-- Only the debtor can withdraw a settlement they posted
drop policy if exists "debtor can delete settlement" on public.settlements;
create policy "debtor can delete settlement"
on public.settlements
for delete
to authenticated
using (
  exists (
    select 1 from public.group_members gm
    where gm.id = settlements.from_member_id
      and gm.profile_id = auth.uid()
  )
);

-------------------------------------------------------------------
-- 4) Archived flag on groups (trip wrap-up)
-------------------------------------------------------------------

alter table public.groups
  add column if not exists archived_at timestamptz;
