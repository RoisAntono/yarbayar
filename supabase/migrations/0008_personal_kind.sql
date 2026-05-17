-- ============================================================================
-- Personal income + expense — add `kind` to make this a real money tracker
-- ============================================================================
--
-- Migration 0007 introduced `personal_expenses` for outflows. Folks
-- pointed out (rightly) that a finance tracker without income is just
-- a minus-only ledger. This migration extends the same table with a
-- `kind` column so we can record both, without splitting the schema
-- into two tables.
--
-- Why one table not two:
--   - All transactions share the same shape: title, amount, date,
--     notes, category. The only thing that differs is sign.
--   - Single source of truth → unified history, simpler aggregation
--     (income - expense = net).
--   - "kind" is constrained by a CHECK so we can never have NULL or
--     a typo'd value.
--
-- We deliberately don't rename the table — that would touch a lot of
-- code (server actions, types, page imports). The column comment
-- below clarifies that "personal_expenses" now also holds incomes,
-- and the comment on the kind column documents the values.
-- ============================================================================

alter table public.personal_expenses
  add column if not exists kind text not null default 'expense'
    check (kind in ('expense', 'income'));

comment on table public.personal_expenses is
  'Personal money-tracker entries. Each row is either an outflow (kind=expense) or inflow (kind=income). Renamed conceptually to "personal transactions" — table name kept for compatibility.';
comment on column public.personal_expenses.kind is
  'Either ''expense'' (default, money out) or ''income'' (money in). Unified history nets these out as income - expense.';

-- Index covers list ORDER BY spent_at desc per user *and* the new
-- "income only" / "expense only" filters on /personal once we add
-- those tabs. Postgres will fall back to the existing
-- (user_id, spent_at desc) index when kind isn't filtered.
create index if not exists idx_personal_expenses_user_kind
  on public.personal_expenses(user_id, kind, spent_at desc);
