-- ============================================================
-- DIAGNOSTIC: Cek state schema yang sudah di-apply ke remote DB
--
-- File ini BUKAN migration. Tujuannya: kasih kamu daftar konkret
-- mana migration yang masih missing, supaya tidak perlu run semua
-- 11 migration secara buta (yang bisa error karena duplicate).
--
-- Cara pakai:
--   1. Buka Supabase Dashboard → SQL Editor → New query.
--   2. Copy seluruh isi file ini, paste, Run.
--   3. Output 6 kolom — masing-masing TRUE/FALSE jadi flag
--      "migration X sudah applied?".
--   4. Lihat tabel "needs to apply" di bawah → daftar SQL file
--      yang harus di-run berurutan.
-- ============================================================

with state as (
  select
    -- 0001_init: kalau profiles + groups + expenses ada, baseline OK.
    --            Kolom currency awalnya tidak ada di schema, baru
    --            ditambah di migration setelahnya.
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'profiles'
    ) as m0001_profiles_exists,

    -- 0001 / kemungkinan diubah belakangan: kolom currency di groups
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'groups'
        and column_name = 'currency'
    ) as m_groups_currency_exists,

    -- 0001: kolom currency di profiles
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'currency'
    ) as m_profiles_currency_exists,

    -- 0002_whoami: function whoami() defined
    exists (
      select 1 from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname = 'whoami'
    ) as m0002_whoami_exists,

    -- 0003_create_group_rpc: function create_group_with_owner_member
    exists (
      select 1 from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname = 'create_group_with_owner_member'
    ) as m0003_create_group_rpc_exists,

    -- 0004: tabel settlements + kolom category di expenses
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'settlements'
    ) as m0004_settlements_exists,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'expenses'
        and column_name = 'category'
    ) as m0004_expense_category_exists,

    -- 0005: ada policy "owner can act for guests" — cek dengan
    -- nama policy yang spesifik
    exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and policyname = 'group_members_owner_proxy_insert'
    ) as m0005_owner_proxy_exists,

    -- 0006: tabel group_invites
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'group_invites'
    ) as m0006_group_invites_exists,

    -- 0007: tabel personal_expenses
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'personal_expenses'
    ) as m0007_personal_expenses_exists,

    -- 0008: kolom kind di personal_expenses
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'personal_expenses'
        and column_name = 'kind'
    ) as m0008_personal_kind_exists,

    -- 0009: kolom archived_at di personal_expenses
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'personal_expenses'
        and column_name = 'archived_at'
    ) as m0009_personal_archived_exists,

    -- 0010: function purge_archived_personal_expenses
    exists (
      select 1 from pg_proc
      where pronamespace = 'public'::regnamespace
        and proname = 'purge_archived_personal_expenses'
    ) as m0010_purge_function_exists,

    -- 0011: kolom monthly_savings_target di profiles
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'monthly_savings_target'
    ) as m0011_savings_target_exists
)
select
  m0001_profiles_exists                        as "0001_init.profiles_table",
  m_profiles_currency_exists                   as "0001_init.profiles.currency",
  m_groups_currency_exists                     as "0001_init.groups.currency",
  m0002_whoami_exists                          as "0002_whoami",
  m0003_create_group_rpc_exists                as "0003_create_group_rpc",
  m0004_settlements_exists                     as "0004.settlements_table",
  m0004_expense_category_exists                as "0004.expenses.category",
  m0005_owner_proxy_exists                     as "0005_owner_can_act_for_guests",
  m0006_group_invites_exists                   as "0006_group_invites",
  m0007_personal_expenses_exists               as "0007_personal_expenses",
  m0008_personal_kind_exists                   as "0008_personal_kind",
  m0009_personal_archived_exists               as "0009_personal_soft_delete",
  m0010_purge_function_exists                  as "0010_purge_archived_personal",
  m0011_savings_target_exists                  as "0011_monthly_savings_target"
from state;
