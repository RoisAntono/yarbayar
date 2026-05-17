-- ============================================================================
-- Soft-delete untuk personal_expenses
-- ============================================================================
--
-- Sebelumnya tindakan "Hapus" di /personal/[id]/edit memanggil DELETE
-- yang permanen. Untuk financial records, hard-delete itu lossy:
--
--   - User salah tap → tidak bisa undo
--   - Migration / debug — tidak ada audit trail
--   - Future trash bin UI butuh data archived
--
-- Solusi: tambah kolom `archived_at`. Action sekarang set kolom ini
-- bukan delete row. Query app-level filter `archived_at IS NULL` di
-- setiap SELECT (lihat src/lib/data.ts).
--
-- Kenapa app-level, bukan di RLS policy?
--   - Kalau filter di policy, archived row jadi invisible bahkan untuk
--     trash bin UI nanti — kita harus bypass policy yang hassle.
--   - App-level filter eksplisit, mudah di-toggle untuk trash view.
--   - RLS policy tetap user-scoped (auth.uid() = user_id), jadi data
--     tidak bocor antar user.
--
-- Group expenses (`expenses` table) belum di-soft-delete — cascade ke
-- expense_splits + settlements lebih kompleks dan butuh refactor
-- balance recomputation. Tracked di AGENTS.md Roadmap.
-- ============================================================================

alter table public.personal_expenses
  add column if not exists archived_at timestamptz;

comment on column public.personal_expenses.archived_at is
  'Soft-delete marker. NULL = aktif. Non-NULL = di-archive pada timestamp ini, akan di-purge dari trash setelah 30 hari (cron job, future).';

-- Partial index supaya list query (WHERE archived_at IS NULL) tetap
-- cepat. Index hanya cover row aktif — yang archived skip index entirely
-- karena rare access.
create index if not exists idx_personal_expenses_active
  on public.personal_expenses(user_id, spent_at desc)
  where archived_at is null;
