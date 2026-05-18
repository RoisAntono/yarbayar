<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project skills

Official Anthropic skills installed at `.claude/skills/` (sourced from
[anthropics/skills](https://github.com/anthropics/skills)).

| Skill | When to apply |
| ----- | ------------- |
| [`frontend-design`](./.claude/skills/frontend-design/SKILL.md) | Building UI components, pages, layouts, or styling any web interface |
| [`webapp-testing`](./.claude/skills/webapp-testing/SKILL.md) | Interacting with / testing the local app via Playwright (UI verify, screenshots, browser logs) |
| [`pdf`](./.claude/skills/pdf/SKILL.md) | Generating PDF reports (monthly expense summary, group invoices) |
| [`xlsx`](./.claude/skills/xlsx/SKILL.md) | Exporting expense data to Excel / CSV |
| [`theme-factory`](./.claude/skills/theme-factory/SKILL.md) | Creating new color themes / palette variants |
| [`brand-guidelines`](./.claude/skills/brand-guidelines/SKILL.md) | Building brand kit, logo system, asset rules |
| [`web-artifacts-builder`](./.claude/skills/web-artifacts-builder/SKILL.md) | Standalone shareable pages (e.g. public invoice links) |
| [`skill-creator`](./.claude/skills/skill-creator/SKILL.md) | Creating new skills or improving existing ones |

Index: [`.claude/skills/README.md`](./.claude/skills/README.md).

For project-specific Yarbayar patterns (Supabase, Next.js 16, library
catalog), see [`PATTERNS.md`](./PATTERNS.md) at the repo root.

## Commit style

- One concern per commit. Use imperative mood ("Add scan-receipt parser",
  not "Added").
- Reference the file or area touched in the summary line.
- Do not commit `.env.local` or anything containing secrets.

## Build verification

Before claiming a change is done, run `npm run build` and ensure it
finishes without TypeScript errors or new warnings.

# Product principles

Yarbayar adalah dual-purpose money tracker: **splitbill grup** + **catatan
keuangan pribadi (pemasukan & pengeluaran)**. Setiap perubahan UI/UX
harus dievaluasi terhadap prinsip di bawah, bukan hanya "apakah jalan".

> **Status legend:** ✅ enforced sepenuhnya · ⚠️ partial (sebagian
> implementasi) · 🎯 aspirational (target, belum implementasi)
>
> Aspirational rule **bukan** larangan — saat menulis kode baru,
> implementasikan prinsipnya. Saat refactor, prioritaskan menutup gap.
> Lihat **Roadmap** di bawah untuk daftar gap konkret.

## Target user: Gen-Z Indonesia (18–28)

Bukan asumsi demografis — ini menentukan **setiap** keputusan: copy,
fitur, fungsi, motion, perf, privacy, social. Karakteristik yang
relevan:

- **Mobile-first, snappy.** Default scroll/tap di HP. Halaman padat
  text bikin bounce. Tap target ≥40px, list row ≤56px, hero card padat
  informasi tapi visual airy.
- **Skim, bukan baca.** Headline + 1 subline cukup. Kalau perlu paragraf
  3 kalimat, mungkin malah disconnect ke modal atau /docs.
- **Bilingual switching natural.** "Cashflow", "split", "scan" dipakai
  bareng "kopi", "bensin", "geng kosan". Jangan paksa lokalisasi penuh
  (jadi awkward) atau English penuh (jadi distant).
- **Color berarti sesuatu.** Hijau = positive/income, merah = negative/
  expense. Bukan dekorasi.
- **Allergi instruksi.** "Centang anggota yang ikut patungan di bawah,
  atau isi nominal/persen/bagian sesuai metode yang kamu pilih" itu
  textbook. "Pilih siapa aja yang ikut bayar di bawah ↓" itu Gen-Z.
- **Default cepat > flexible.** Smart default lebih dihargai dari
  endless config. Tanggal hari ini, kategori auto-infer, payer terakhir
  diingat — semua menghemat tap.
- **Bukti sosial > self-promo.** "12 teman lagi pakai" lebih ngena dari
  "fitur baru!". Hindari modal celebration yang nge-block flow.
- **Privacy by default.** Data finansial sensitif — tidak ada analytics
  tracking yang berlebihan, tidak ada "share to social" yang ekspos
  nominal default. Setiap export harus eksplisit.
- **Social connection itu fungsional.** Splitbill = primary social
  surface. Invite link 1-tap, lihat siapa yang udah bayar, status
  "Kamu lunas dengan grup ini ✨" — bukan gimmick, ini retention.

## Feature philosophy

Ngga semua fitur layak dibangun. Filter sebelum approve:

- **Fix friction sebelum tambah fitur.** Splitbill yang bikin user
  itung manual = friction. Scan nota auto-fill = fix. Ini lebih
  prioritas dari "dark mode" atau "custom currency".
- **MVP-first untuk fitur baru.** Income tracker tanpa kategori dulu —
  user bisa pakai dalam 1 tap. Kategori income bisa nyusul kalau
  request volume tinggi.
- **Auto-everything yang aman, manual untuk yang sensitif.** Auto-infer
  category aman (user bisa edit gampang). Auto-confirm settlement TIDAK
  aman (data tentang siapa berhutang ke siapa harus dual-confirm).
- **One-tap action untuk daily flow, multi-step untuk monthly.** Catat
  pengeluaran hari ini = 1 tap FAB + 3 field. Generate laporan trip =
  3-4 tap karena jarang dilakukan.
- **Tidak ada paywall di core flow.** Splitbill, riwayat, scan nota —
  free forever. Premium hanya untuk export, integrasi, atau analytics
  advanced (kalau ever).
- **Hapus fitur yang tidak dipakai.** Lebih baik aplikasi punya 8 fitur
  yang dipakai daripada 30 fitur yang stale. Telemetri usage menentukan
  apakah sebuah fitur tetap di app atau di-deprecate.

## Functional behavior

Default behavior pada interaksi umum yang Gen-Z expect:

- 🎯 **Optimistic UI di mana feasible.** Toggle status, mark paid, swipe
  delete — UI langsung respond, sync ke server di background, rollback
  kalau gagal dengan toast error yang clear. _Settlement actions
  (mark paid / confirm / withdraw) belum optimistic — server roundtrip
  + revalidatePath. Lihat Roadmap untuk reasoning kenapa skip dulu._
- ✅ **Server actions untuk write, RSC untuk read.** Konsisten di seluruh
  app. Tidak boleh API route handler kecuali ada alasan kuat (webhook,
  third-party callback).
- ✅ **Revalidate path setelah mutate.** `revalidatePath('/personal')`
  setelah create/update/delete personal expense. Tidak boleh manual
  refresh.
- ✅ **State persistence yang sopan.** Form draft di localStorage saat
  user belum simpan, hapus draft setelah submit sukses. Bukan
  auto-save tiap detik. (Pakai `useFormDraft` hook di
  `src/hooks/use-form-draft.ts`. Sudah dipakai di personal-form +
  expense-form, scope per-form atau per-group.)
- ✅ **Empty state yang produktif.** Tidak boleh "No data" doang — selalu
  ada CTA atau hint apa next step.
- ✅ **Error message yang aksiable.** "Gagal upload nota, tapi nominal
  tetap tersimpan" lebih baik dari "Network error". User tau apa yang
  selamat dan apa yang harus dilakukan.

## Motion & interaction

Gen-Z tumbuh dengan iOS/TikTok motion vocab. Default kita ikut itu:

- ✅ **Spring-based, bukan linear.** Easing `ease-out` 200ms untuk
  transisi state. Motion harus reflect physics, bukan tick clock.
- ✅ **Active-state scale 0.95.** Tap feedback di setiap button/card
  yang interactive. Class `active:scale-95`/`active:scale-[0.98]`.
- ✅ **Float-in untuk content baru.** Cards yang muncul karena route
  transition pakai `.float-in` (existing utility). Stagger delay
  60ms antar item untuk efek wave.
- ✅ **Skeleton, bukan spinner full-screen.** Loading state harus
  preserve layout — user tau apa yang lagi dimuat. (Primitive di
  `src/components/ui/skeleton.tsx` + `loading.tsx` di setiap route
  utama: `/`, `/groups`, `/groups/[id]`, `/personal`, `/history`.)
- ✅ **Reduce motion respected.** `prefers-reduced-motion` matters.
  Disable animation, jangan disable functionality. (Sudah di
  `globals.css` + `animated-number.tsx`.)
- ✅ **Haptic-like feedback opsional.** Mobile browser belum ada haptic
  reliable, tapi visual confirmation (toast, color flash) wajib
  setelah action sukses. (Pakai `sonner` untuk toast.)

## Performance budget

Slow app = user dropoff. Patokan teknis:

- **First Contentful Paint < 1.5s** di 3G simulated.
- **Hero card di Beranda harus visible tanpa wait** — pakai server
  rendering untuk shell, hydrate untuk interaksi.
- **No layout shift saat data masuk.** Skeleton harus match real
  card dimension. CLS < 0.05.
- **Bundle splitting agresif.** Halaman setup, scan nota, dan
  laporan PDF lazy-load. Beranda + /personal harus minimal.
- **Image optimization wajib.** Next/Image untuk avatar dan emoji
  illustration. Receipt photos di Supabase Storage dengan transform.

## Privacy & data

- ✅ **Default private.** Group expense visible hanya untuk member.
  Personal data 100% private (RLS strict, sudah di setiap migration).
- ✅ **No third-party analytics yang invasive.** Vercel Analytics OK
  (privacy-friendly), Mixpanel/Amplitude/Hotjar TIDAK. (Saat ini
  belum ada analytics tool yang dipasang — baseline aman.)
- ✅ **Export adalah eksplisit user action**, tidak pernah otomatis.
- ⚠️ **Soft-delete untuk financial records.** _`personal_expenses`
  punya soft-delete penuh: action `delete` set `archived_at`, query
  filter `IS NULL`, ada trash bin di `/profile/trash` dengan restore +
  permanent purge. `groups` dan `expenses` masih hard-delete — perlu
  cascade refactor untuk `expense_splits` + `settlements`._
- ✅ **Foto nota encrypted at rest.** Supabase Storage default sudah
  AES-256, jangan turn off.

## Accessibility

Bukan optional, dan lebih dari sekadar contrast ratio:

- **Tap target ≥40×40px.** Lebih kecil = pasti gagal di kompetisi
  tap-test dengan jempol di angkot.
- **Focus ring visible.** `focus-visible:ring-2 ring-[--color-ring]`
  jangan dihapus untuk "estetik".
- **Semantic HTML first.** `<button>` bukan `<div onClick>`.
  `<input type="date">` bukan custom date picker yang fiddly.
- **`aria-label` untuk icon-only button.** "Tambah pengeluaran",
  "Hapus", "Bulan sebelumnya".
- **Color tidak boleh sole signal.** Income/expense distinction
  pakai warna **dan** ikon (ArrowDownLeft/ArrowUpRight) **dan**
  prefix (+Rp/−Rp). Color-blind user tetap bisa pakai.
- **Bahasa Indonesia screen reader-friendly.** "Rp 25.000" dibaca
  "rupiah dua puluh lima ribu" — jangan pakai abbreviasi yang
  ambigu di label.

## Microcopy guidelines

Empat aturan, urutan prioritas:

1. **Maksimal satu kalimat pendek.** Kalau butuh dua kalimat, mungkin
   tidak butuh copy itu — UI yang harus jelas.
2. **Action atau outcome, bukan instruksi.** User ngga butuh
   dijelasin caranya, mereka butuh tahu apa yang akan terjadi.
3. **Bahasa percakapan natural.** Bukan formal "kamu wajib mengisi",
   bukan forced gaul "bro/sis", bukan corporate "silakan masukkan".
   Patokan: bayangin lagi WA temenmu.
4. **Empati di kondisi negatif.** Defisit, lunas tidak tercapai, error
   — semua fact-of-life. Jangan dishame, jangan over-cheery.

Beberapa anti-pattern yang sudah dihilangkan dan **tidak boleh kembali**:

| ❌ Don't | ✅ Do |
| --- | --- |
| "Mis. Kopi pagi, bensin, beli baju" | "Kopi, bensin, jajan…" |
| "Tidak pilih = otomatis tebak dari judul." | "Skip aja, nanti kami tebak." |
| "Surplus — bagus, lanjutkan!" | "Pemasukan > pengeluaran" |
| "Defisit, hati-hati keuangan" | "Pengeluaran > pemasukan" |
| "Mulai dengan buat grup, ajak teman, lalu catat pengeluaran bareng." | "Buat grup, ajak teman, mulai splitbill." |
| "Centang anggota yang ikut patungan di bawah, atau isi nominal/persen/bagian sesuai metode yang kamu pilih." | "Pilih siapa aja yang ikut bayar di bawah ↓" |
| "Catat pengeluaran pertama, atau scan nota langsung dari kamera." | "Tap tombol di bawah buat catat atau scan nota." |

Pattern: hapus "Mis." / "Misalnya" prefix, hapus konjungsi "atau ...",
hapus paragraf instruksi step-by-step.

## Color semantics

Tiga CSS var yang **non-negotiable**, jangan diganti hardcoded
tailwind (`emerald-600`, `rose-600`, dll):

| Var | Pakai untuk |
| --- | --- |
| `--color-success` | Income, surplus, "kamu terima", saldo positif, status "Lunas" |
| `--color-destructive` | Expense, defisit, "kamu bayar", saldo negatif, danger zone |
| `--color-accent` (saffron) | **Brand CTA generic** (FAB, "Buat grup", "Catat pribadi"). NEVER untuk income/expense semantic |

Aturan praktis:

- Saat income & expense **side-by-side** (toggle picker, list row dengan
  income tampak bersamaan) → **wajib** hijau vs merah untuk semantic
  contrast. Saffron di sini akan kontradiksi dengan hijau dan bikin
  "default vs positive" feel.
- Saat hanya satu yang tampil (tombol "Tambah pengeluaran" sendirian
  di header) → boleh saffron, brand identity menang.
- Tinted bg + ikon + text color harus **selalu** match. Jangan card
  hijau muda dengan ikon saffron — itu visual mismatch.

## Form UX

Pattern yang harus dipertahankan untuk form yang baru dibuat:

- **Decision point pertama di paling atas.** Pengeluaran/pemasukan
  toggle ada sebelum field lain — semua field setelahnya ngikut konteks.
- **Auto-focus title pada create.** Pada edit, jangan auto-focus
  (user mungkin lagi review, bukan ngetik).
- **Advanced collapsed by default.** Tanggal & catatan hide kecuali
  user expand. Default tanggal = hari ini, notes = empty.
- **Auto-infer category dari title.** User skip kategori → kami tebak.
  Kalau salah, mereka bisa edit. Mengurangi friction.
- **Color-code Card jumlah.** Tinted bg + border + ikon + prefix
  (Rp/+Rp/−Rp) semua match kind aktif. Bobot visual income vs expense
  harus sama, jangan satu plain satu tinted.

## Mobile FAB & nav

- Bottom nav: 4 item (Beranda · Grup · Pribadi · Saya) + 1 FAB tengah.
- FAB context-aware: di group → new group expense, di tempat lain →
  new personal expense (high-frequency Gen-Z flow).
- Tidak ada floating button extra di pojok pill — itu inkonsisten
  visual dan area FAB collision.

## Database conventions

- `personal_expenses` punya kolom `kind` (`expense` | `income`) dengan
  CHECK constraint. **Single table**, bukan dua tabel terpisah —
  schemanya identik kecuali sign.
- Composite index `(user_id, spent_at desc)` cukup untuk list +
  monthly summary range scan. **Tidak boleh** functional index pakai
  `date_trunc('month', timestamptz)` — Postgres tolak STABLE function
  di expression index.
- Group expense rows di `getUnifiedExpenses` selalu `kind: "expense"`
  (group flow itu shared expense, bukan personal income).

## Currency convention

- ✅ **`profiles.currency`** menyimpan ISO 4217 code (default `IDR`).
  Picker di `/profile/currency` — 9 currency curated (IDR, USD, SGD,
  MYR, THB, JPY, EUR, GBP, AUD). Helper di `src/lib/currency.ts`:
  `getCurrencyConfig(code)` defensive default ke IDR,
  `isSupportedCurrency(code)` untuk validate enum di server action.
- ✅ **Format-only, BUKAN conversion.** Setting cuma ubah how angka
  di-render di UI. Nilai stored tidak pernah di-convert otomatis.
  Disclaimer eksplisit di picker page.
- ✅ **`formatMoney(value, code)`** generic + memoized
  `Intl.NumberFormat` cache di `src/lib/utils.ts`. `formatRupiah` /
  `formatRupiahShort` kept sebagai backwards-compat alias yang call
  `formatMoney(v, "IDR")`. Group expense displays tetap pakai
  `formatRupiah` karena `groups.currency` independen (default IDR,
  belum exposed ke UI).
- ✅ **User-scope vs group-scope dipisah.** Cashflow card Beranda,
  /personal, /history, /profile/trash → render dengan
  `profile.currency`. Hero saldo Beranda + group rows → tetap
  `formatRupiah` (aggregate dari group nets).
- ✅ **Group-level currency override.** Schema `groups.currency`
  exposed ke UI via owner-only picker di
  `/groups/[id]/settings/currency-picker.tsx`. Mata uang grup
  independen dari user-level `profiles.currency` — relevan untuk trip
  internasional (mis. user IDR-default tapi grup "Bali Trip" → IDR,
  grup "Tokyo 2027" → JPY). Display surfaces yang sudah pakai
  `formatMoney(amount, group.currency)`: `/groups` list cards,
  `/groups/[id]` hero + members strip + settlements suggestions/pending,
  `/groups/[id]/expenses/[expenseId]` detail + delete confirm,
  ExpenseGroupings bucket totals + row amounts. Server action
  `updateGroupCurrencyAction` defense-in-depth: cek `isSupportedCurrency`
  + owner ownership before write. Picker disclaimer "format-only,
  bukan conversion" sama dengan user-level picker — wajib supaya user
  tidak kaget angka tetap sama setelah switch currency.
- ✅ **Group currency end-to-end coverage.** `/groups/[id]/report`
  page (8 callsite — total trip, status pill akan terima/harus bayar,
  bagian/bayar di muka headline, breakdown kategori, sisa utang,
  riwayat pelunasan) pakai local `fmt = (n) => formatMoney(n, group.currency)`
  helper untuk callsite ringkas. `expense-form.tsx` (4 callsite —
  scan toast, sisa/lebih hint, per-member split estimate) ditangani
  via `currency` prop wajib + local `fmt` helper, di-thread dari
  `/groups/[id]/expenses/new` dan `/groups/[id]/expenses/[expenseId]/edit`
  parent. Tidak ada lagi `formatRupiah` di group surface — semua
  amount yang display dengan context grup pasti pakai `group.currency`.


## Default-action vs confirmation

- ✅ Tap row personal → langsung `/personal/[id]/edit` (low-stakes).
- ✅ Delete personal/group expense → ConfirmDialog (destructive,
  irreversible).
- ✅ Hapus grup permanen / cabut invite link → ConfirmDialog dengan
  varian destructive.

# Roadmap (gap antara principle vs implementasi)

Pekerjaan refactor/fitur konkret untuk menutup gap di prinsip
aspirational. Bukan urutan eksekusi — pilih berdasarkan dampak.

## Functional gap

- 🎯 **Optimistic UI untuk settlement actions.** `markPaidAction`,
  `confirmSettlementAction`, `unmarkPaidAction` di
  `groups/[id]/settlements/actions.ts` — UI sebaiknya langsung toggle
  state lalu sync. Pakai `useOptimistic` di `SettlementsCard`.
  **Catatan:** ini deliberately ditunda. Settlement actions men-trigger
  `revalidatePath` yang re-compute balance dari multiple tables
  (expenses, splits, settlements). Optimistic state harus mirror full
  balance recomputation di client — duplikasi logic yang brittle.
  Saat ini server roundtrip ~200ms cukup acceptable + ada loading
  state via `useTransition`. Skip dulu sampai ada user feedback nyata
  bahwa lag terasa.
- ✅ **Form draft persistence.** `useFormDraft` hook di
  `src/hooks/use-form-draft.ts` dengan 24h staleness window. Dipakai
  di personal-form dan expense-form. Submit clears draft via wrapper
  `handleSubmit` (lebih reliable dari useEffect cleanup karena
  `redirect()` kill form lifecycle).
- ✅ **Smart defaults untuk payer.** `expense-form.tsx` baca
  `getLocalPref(payerKey(groupId))` saat init paidBy, save ulang
  setelah submit sukses. Per-group scoped key biar tidak bocor antar
  grup.

## Loading state gap

- ✅ **`loading.tsx` di semua route utama dan sekunder** — Beranda,
  Groups, Group detail, Personal, History, plus `/groups/[id]/report`,
  `/groups/[id]/expenses/[expenseId]`, `/groups/[id]/settings`,
  `/profile/trash`, `/profile/currency`. Setiap skeleton match dimensi
  card asli supaya CLS ≈ 0.
- ✅ **Streaming Suspense di Beranda, /personal, /history.** Tiga
  route utama dipecah jadi 3-4 Suspense boundary masing-masing.
  Pattern: shell + static section render sync (greeting, quick
  actions, header), data-driven section streamed (hero card,
  cashflow card, list rows). Pakai `React.cache()` untuk dedup
  fetcher yang dipanggil multiple boundary (mis. `getProfile` di
  header subtitle DAN cashflow render). Skeleton match dimensi
  card asli (CLS ≈ 0).


## Soft-delete migration

- ✅ **`personal_expenses.archived_at`** dengan partial index
  `idx_personal_expenses_active` untuk filter `archived_at IS NULL`.
  Migration `0009_personal_soft_delete.sql`. App-level filter di
  `getPersonalExpenses`, `getUnifiedExpenses`, dan edit page query.
- ✅ **Trash bin UI** di `/profile/trash` — list archived rows dengan
  restore + permanent purge action. Entry-point dari `/profile`
  dengan badge count. Empty state productive ("Sampah kosong" + CTA
  balik ke /personal). Pattern hidden form + ConfirmDialog konsisten
  dengan delete elsewhere.
- 🎯 **`expenses.archived_at`** untuk group expense — perlu refactor
  cascade ke `expense_splits` + balance recompute. Lebih kompleks.
- ✅ **Cron purge job** (auto-delete archived rows >30 hari).
  Migration `0010_purge_archived_personal.sql` define SQL function
  `purge_archived_personal_expenses()` (SECURITY DEFINER, granted
  ke service_role only). API route `/api/cron/purge-archived`
  guarded by `Authorization: Bearer ${CRON_SECRET}`, pakai
  service-role admin client (`src/lib/supabase/admin.ts`).
  Vercel Cron schedule daily 02:00 UTC di `vercel.json`. Idempotent
  — re-run kasih deleted_count = 0 tanpa error.


## Performance gap

- ✅ **Receipt scanner lazy load.** `receipt-scanner-loader.tsx`
  pakai `next/dynamic` ssr:false → ~1.5MB OCR pipeline tidak masuk
  main bundle.
- ✅ **Streaming Suspense untuk Beranda.** Done — lihat "Loading
  state gap" di atas. FCP turun signifikan karena shell + Quick
  Actions render tanpa nunggu Supabase fetch.
- 🎯 **Lazy load PDF/XLSX libraries** _kalau nanti dipakai_. Saat ini
  belum ada `pdf-lib` / `exceljs` di project — laporan trip masih
  HTML print. Kalau nanti generate PDF native, wajib `next/dynamic`
  pattern.


## Feature backlog (Gen-Z friendly)

Bukan to-do urgent, tapi reminder kalau user request datang:

- ✅ **Goal pemasukan** ("nabung Rp 500rb bulan ini" → progress bar di
  /personal). _Implemented._ Schema: `profiles.monthly_savings_target`
  numeric nullable + CHECK >= 0 (migration `0011`). Server action
  `updateSavingsTargetAction` di `profile/actions.ts` accept amount
  string (parseRupiahInput), 0/empty → null reset. Picker page
  `/profile/goal` mirror pattern `/profile/currency` — disclaimer
  card + form dengan live preview formatMoney. `GoalCard` di
  `/personal` punya 4 state empatik: NULL → empty CTA, reached →
  milestone success, on-track → progress bar + "tinggal X lagi",
  defisit → gentle reframe "mungkin set target lebih kecil?".
  Suspense boundary terpisah dari HeroCashflow supaya goal data
  tidak block hero render. Reset bulanan implicit — net dihitung dari
  `getMonthlySummary` yang filter ke bulan berjalan.
- Splitbill iuran rutin (kos, langganan) — trigger expense otomatis
  tiap bulan tanggal yang sama.
- Request settlement via WA deeplink (otomatis pre-fill pesan).
- QRIS payment screenshot recognition (selain nota receipt).

