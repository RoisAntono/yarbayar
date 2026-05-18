-- ============================================================================
-- Cron purge function untuk personal_expenses yang udah di-archive >30 hari
-- ============================================================================
--
-- Trash bin UI di /profile/trash kasih copy "auto-purge 30 hari", tapi
-- sampai migration ini cuma intent — row tetap nyangkut di DB sampai
-- user manual purge. Migration ini implement enforcement-nya.
--
-- Dua bagian:
--   1. Function `purge_archived_personal_expenses()` — pure DELETE pada
--      row yang archived_at < now() - 30 days. Returns affected count.
--   2. Function di-mark `security definer` supaya bisa di-call dari
--      service-role API route tanpa kena RLS yang scope ke auth.uid().
--      Service role tetap perlu untuk bypass RLS — function-nya cuma
--      kasih wrapper yang lebih portable + auditable.
--
-- Trigger frequency: daily 02:00 UTC via Vercel Cron (vercel.json di
-- repo root). 02:00 UTC = 09:00 WIB, jam off-peak Indonesia jadi load
-- DB minimum.
--
-- Why 30 days, bukan 7 atau 60?
--   - 30 hari = standard mental model untuk "trash" di sebagian besar
--     OS/cloud provider (Windows Recycle Bin, macOS Trash, Gmail).
--   - User yang baru sadar salah hapus 2-3 minggu later masih bisa
--     pulihkan. Setelah 30 hari, kemungkinan udah ngga butuh data-nya.
-- ============================================================================

create or replace function public.purge_archived_personal_expenses()
returns table (deleted_count bigint)
language plpgsql
security definer
-- Set search_path supaya function tidak vulnerable ke injection lewat
-- search_path manipulation. Best practice untuk security definer.
set search_path = public
as $$
declare
  rows_deleted bigint;
begin
  with deleted as (
    delete from public.personal_expenses
    where archived_at is not null
      and archived_at < now() - interval '30 days'
    returning id
  )
  select count(*) into rows_deleted from deleted;

  return query select rows_deleted;
end;
$$;

comment on function public.purge_archived_personal_expenses() is
  'Hard-delete personal_expenses yang archived_at >30 hari lalu. Di-call dari API route /api/cron/purge-archived dengan service role + CRON_SECRET. Returns row count yang di-purge.';

-- Grant execute ke service_role only — tidak ke authenticated users.
-- Cron route yang panggil pakai service role key, jadi user biasa
-- tidak bisa trigger purge bahkan kalau mereka ngintip API.
revoke all on function public.purge_archived_personal_expenses() from public;
revoke all on function public.purge_archived_personal_expenses() from authenticated;
revoke all on function public.purge_archived_personal_expenses() from anon;
grant execute on function public.purge_archived_personal_expenses() to service_role;
