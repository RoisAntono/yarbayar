-- ============================================================
-- Monthly savings target
--
-- User-level field di `profiles` untuk menyimpan target nabung
-- bulanan. NULLable supaya user yang belum set goal tetap bisa
-- pakai semua fitur lain — feature ini opt-in.
--
-- Kenapa scalar di profiles, bukan tabel `monthly_goals` history?
--   - MVP: 1 target aktif sudah cukup untuk progress bar Beranda/
--     Personal. Tidak ada UI yang nampilkan "pencapaian bulan
--     sebelumnya" yet.
--   - Denormalize-friendly: 1 row JOIN gratis, dipakai di setiap
--     fetch profile. Tabel terpisah berarti +1 query per render.
--   - Future-proof: kalau nanti perlu history, bisa migrate ke
--     `monthly_goals (user_id, year_month, target)` dengan
--     INSERT-from-select dari kolom ini, tanpa breaking change.
--
-- Format: numeric(14,2) match dengan `expenses.amount` /
-- `personal_expenses.amount` — same precision, same range.
-- ============================================================

alter table public.profiles
  add column if not exists monthly_savings_target numeric(14, 2)
    check (monthly_savings_target is null or monthly_savings_target >= 0);

comment on column public.profiles.monthly_savings_target is
  'Target nabung bulanan dalam profile.currency. NULL = belum set goal.';
