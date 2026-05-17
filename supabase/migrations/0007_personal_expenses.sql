-- ============================================================================
-- Personal expenses
-- ============================================================================
--
-- Yarbayar started as splitbill-only. This migration adds a parallel
-- "pengeluaran pribadi" feature that turns it into a personal-finance
-- tracker too. Three design choices to highlight:
--
--   1. SEPARATE TABLE, not a flag on `expenses`. The group-expense
--      schema requires `group_id` and `paid_by_member_id`, which
--      doesn't make sense for a solo coffee. Forcing a "personal
--      group" everywhere would clutter every group query. Cleaner to
--      have its own table that only this user can see.
--
--   2. AUTO-SYNC AT READ TIME. The unified history view is
--      computed via UNION between (personal_expenses)
--      and (my share of group expenses). We never write the share
--      twice. That keeps source-of-truth crisp: when a group expense
--      is edited, the user's history updates automatically.
--
--   3. SAME `category` SLUG SHAPE as group expenses. Lets the
--      breakdown / summary widgets reuse the same logic.
-- ============================================================================

create table if not exists public.personal_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  amount numeric(14, 2) not null check (amount > 0),
  -- Match group expense currency default for consistency.
  currency text not null default 'IDR',
  -- Category slug — same shape as expenses.category. Free-form text,
  -- the inference logic in src/lib/categories.ts handles labelling.
  category text,
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Composite index covers both the list query (ORDER BY spent_at desc
-- per user) and the monthly summary (range scan on spent_at within a
-- user). We deliberately don't add a `date_trunc('month', spent_at)`
-- functional index — date_trunc on `timestamptz` is STABLE (depends
-- on session TimeZone), and Postgres refuses STABLE functions in
-- index expressions. The range-scan strategy on the existing index
-- is plenty fast for our workloads.
create index if not exists idx_personal_expenses_user
  on public.personal_expenses(user_id, spent_at desc);

-- Bump updated_at on row update.
create or replace function public.touch_personal_expense_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_personal_expenses_touch on public.personal_expenses;
create trigger trg_personal_expenses_touch
  before update on public.personal_expenses
  for each row execute function public.touch_personal_expense_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- Strictly user-scoped. Each user can read/write only their own rows;
-- there's no sharing model since these are personal.

alter table public.personal_expenses enable row level security;

drop policy if exists personal_expenses_select on public.personal_expenses;
create policy personal_expenses_select on public.personal_expenses
  for select using (auth.uid() = user_id);

drop policy if exists personal_expenses_insert on public.personal_expenses;
create policy personal_expenses_insert on public.personal_expenses
  for insert with check (auth.uid() = user_id);

drop policy if exists personal_expenses_update on public.personal_expenses;
create policy personal_expenses_update on public.personal_expenses
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists personal_expenses_delete on public.personal_expenses;
create policy personal_expenses_delete on public.personal_expenses
  for delete using (auth.uid() = user_id);
