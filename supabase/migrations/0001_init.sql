-- =============================================================================
-- Yarbayar — Splitbill App
-- Supabase initial schema
--
-- Concepts:
--   profiles        : 1-1 with auth.users (created on signup via trigger)
--   groups          : a "team" / trip / circle of friends
--   group_members   : people inside a group. May be linked to a real profile
--                     (registered user) OR be just a display name (offline guest)
--   expenses        : a single bill paid by one member
--   expense_splits  : how that expense is split per member (sums to amount)
--
-- All policies are scoped: a user only sees groups they own OR are a member of
-- (linked via profile_id). Receipts go to the `receipts` storage bucket.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'split_method') then
    create type public.split_method as enum ('equal', 'exact', 'percent', 'shares');
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text not null default 'IDR',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are viewable by owner" on public.profiles;
create policy "profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles updatable by owner" on public.profiles;
create policy "profiles updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "profiles insert by owner" on public.profiles;
create policy "profiles insert by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- groups
-- ---------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  emoji text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists groups_owner_idx on public.groups(owner_id);

alter table public.groups enable row level security;

-- ---------------------------------------------------------------------------
-- group_members
-- ---------------------------------------------------------------------------
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (group_id, profile_id)
);

create index if not exists group_members_group_idx on public.group_members(group_id);
create index if not exists group_members_profile_idx on public.group_members(profile_id);

alter table public.group_members enable row level security;

-- Helper: check if current user can access a group (owner or has a linked member)
create or replace function public.is_group_visible(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups g where g.id = _group_id and g.owner_id = auth.uid()
  ) or exists (
    select 1 from public.group_members gm
    where gm.group_id = _group_id and gm.profile_id = auth.uid()
  );
$$;

-- group policies
drop policy if exists "groups visible to members" on public.groups;
create policy "groups visible to members"
  on public.groups for select
  using (public.is_group_visible(id));

drop policy if exists "groups insert by owner" on public.groups;
create policy "groups insert by owner"
  on public.groups for insert
  with check (auth.uid() = owner_id);

drop policy if exists "groups update by owner" on public.groups;
create policy "groups update by owner"
  on public.groups for update
  using (auth.uid() = owner_id);

drop policy if exists "groups delete by owner" on public.groups;
create policy "groups delete by owner"
  on public.groups for delete
  using (auth.uid() = owner_id);

-- group_members policies
drop policy if exists "members visible to group members" on public.group_members;
create policy "members visible to group members"
  on public.group_members for select
  using (public.is_group_visible(group_id));

drop policy if exists "members managed by group owner" on public.group_members;
create policy "members managed by group owner"
  on public.group_members for all
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  paid_by_member_id uuid not null references public.group_members(id) on delete restrict,
  title text not null check (length(trim(title)) > 0),
  notes text,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'IDR',
  split_method public.split_method not null default 'equal',
  spent_at timestamptz not null default now(),
  receipt_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists expenses_group_idx on public.expenses(group_id, spent_at desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses visible to group members" on public.expenses;
create policy "expenses visible to group members"
  on public.expenses for select
  using (public.is_group_visible(group_id));

drop policy if exists "expenses insert by group members" on public.expenses;
create policy "expenses insert by group members"
  on public.expenses for insert
  with check (public.is_group_visible(group_id) and auth.uid() = created_by);

drop policy if exists "expenses update by creator or owner" on public.expenses;
create policy "expenses update by creator or owner"
  on public.expenses for update
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.groups g
      where g.id = expenses.group_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists "expenses delete by creator or owner" on public.expenses;
create policy "expenses delete by creator or owner"
  on public.expenses for delete
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.groups g
      where g.id = expenses.group_id and g.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- expense_splits
-- ---------------------------------------------------------------------------
create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.group_members(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (expense_id, member_id)
);

create index if not exists expense_splits_expense_idx on public.expense_splits(expense_id);
create index if not exists expense_splits_member_idx on public.expense_splits(member_id);

alter table public.expense_splits enable row level security;

drop policy if exists "splits visible via expense" on public.expense_splits;
create policy "splits visible via expense"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and public.is_group_visible(e.group_id)
    )
  );

drop policy if exists "splits write via expense" on public.expense_splits;
create policy "splits write via expense"
  on public.expense_splits for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and (
          e.created_by = auth.uid()
          or exists (
            select 1 from public.groups g
            where g.id = e.group_id and g.owner_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and (
          e.created_by = auth.uid()
          or exists (
            select 1 from public.groups g
            where g.id = e.group_id and g.owner_id = auth.uid()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for receipts
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts read by authed" on storage.objects;
create policy "receipts read by authed"
  on storage.objects for select
  using (bucket_id = 'receipts' and auth.role() = 'authenticated');

drop policy if exists "receipts insert by owner" on storage.objects;
create policy "receipts insert by owner"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts delete by owner" on storage.objects;
create policy "receipts delete by owner"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
