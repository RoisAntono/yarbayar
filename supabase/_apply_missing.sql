-- ============================================================
-- IDEMPOTENT PATCH: Apply migration yang missing di remote DB
--
-- Berdasarkan output diagnostic, dua hal yang belum applied:
--   1. groups.currency column (root cause crash di Beranda + /groups)
--   2. 0005 settlement owner-proxy policies (potensi gagal saat
--      owner proxy guest di settlements flow)
--
-- File ini SAFE untuk re-run: tiap statement pakai
-- IF NOT EXISTS / DROP IF EXISTS pattern. Ngga akan break apa-apa.
--
-- Cara pakai:
--   1. Supabase Dashboard → SQL Editor → New query.
--   2. Copy seluruh isi file, paste, Run.
--   3. Tidak ada output rows expected — sukses kalau "Success.
--      No rows returned" atau "OK".
--   4. Refresh app (npm run dev sudah running) → error harusnya
--      hilang.
-- ============================================================


-- -----------------------------------------------------------------
-- PATCH 1: groups.currency
--
-- 0001_init.sql original mendefine `currency text not null default
-- 'IDR'` di table `groups`. Kalau missing di remote DB, kemungkinan
-- besar 0001 di-apply versi lama tanpa kolom ini.
--
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS aman re-run — Postgres
-- skip kalau kolom sudah ada.
-- -----------------------------------------------------------------

alter table public.groups
  add column if not exists currency text not null default 'IDR';

-- Pastikan default explicitly set kalau nanti ada row legacy yang
-- created sebelum default applied. Update ini idempotent — cuma
-- update row yang masih NULL/empty (defensive, harusnya zero rows).
update public.groups set currency = 'IDR' where currency is null or currency = '';


-- -----------------------------------------------------------------
-- PATCH 2: settlement RLS policies (0005_owner_can_act_for_guests)
--
-- Re-apply 0005 policies. drop if exists + create memastikan idempotent
-- (tidak duplicate policy name error). Boleh jalan walau 0005 sudah
-- partial-applied — drop will succeed atau no-op.
-- -----------------------------------------------------------------

-- Insert policy
drop policy if exists "debtor can insert settlement" on public.settlements;
drop policy if exists "debtor or owner can insert settlement" on public.settlements;
create policy "debtor or owner can insert settlement"
on public.settlements
for insert
to authenticated
with check (
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

-- Update policy
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

-- Delete policy
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


-- -----------------------------------------------------------------
-- VERIFY: re-run diagnostic, harusnya groups.currency dan
-- 0005_owner_can_act_for_guests jadi true.
-- -----------------------------------------------------------------

select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'groups'
      and column_name = 'currency'
  ) as "groups.currency_now_exists",
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and policyname = 'debtor or owner can insert settlement'
  ) as "settlement_owner_proxy_now_active";
