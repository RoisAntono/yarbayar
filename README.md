# Yarbayar 💸

Aplikasi splitbill mobile-first untuk catat dan bagi pengeluaran bareng teman.

- 🔐 Auth via Supabase (email + password)
- 👥 Grup, anggota terdaftar maupun tamu
- 🧮 Empat metode split: sama rata, manual, persen, bagian
- 📸 Scan nota dengan OCR Tesseract.js (di browser, gratis)
- 📜 Riwayat transaksi terorganisir per hari
- ⚖️ Saran pembayaran otomatis (minimum transfer)
- 📱 Mobile-first dengan bottom navigation, glass header, swipe-down sheet
- 🎨 Tailwind v4 + tema kustom (light & dark)
- 🚀 Deploy ke Vercel, data di Supabase

## Tech Stack

| Layer        | Pilihan                                                       |
| ------------ | ------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router + Turbopack) + React 19                |
| Bahasa       | TypeScript                                                    |
| Styling      | Tailwind CSS v4 + tw-animate-css                              |
| UI Primitives| Radix UI (Dialog, Dropdown, Tooltip), Vaul (mobile drawer)    |
| Animations   | Framer Motion                                                 |
| Theming      | next-themes (light/dark/system)                               |
| Forms        | React Server Actions + `useActionState`, Zod, react-hook-form |
| Database     | Supabase Postgres + Row Level Security                        |
| Auth         | Supabase Auth                                                 |
| Storage      | Supabase Storage (bucket `receipts`)                          |
| OCR          | Tesseract.js (lazy-loaded di klien)                           |
| Charts       | Recharts (untuk laporan/grafik di iterasi berikutnya)         |
| Notifications| Sonner (toast)                                                |
| Icons        | Lucide React                                                  |
| Analytics    | @vercel/analytics + @vercel/speed-insights                    |
| Linting      | ESLint (Next config) + eslint-config-prettier                 |
| Formatting   | Prettier + prettier-plugin-tailwindcss                        |
| Hosting      | Vercel                                                        |

## Setup lokal

### 1. Install dependencies

```powershell
npm install
```

### 2. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) lalu buat project baru.
2. Di **Project Settings → API**, salin `Project URL` dan `anon public` key.
3. Buat file `.env.local` di root project (jangan commit!):

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

### 3. Jalankan migrasi database

Buka **SQL Editor** di dashboard Supabase. Jalankan **berurutan**:

1. `supabase/migrations/0001_init.sql` — skema dasar, RLS, bucket Storage
2. `supabase/migrations/0002_whoami.sql` — diagnostic helper untuk debug RLS
3. `supabase/migrations/0003_create_group_rpc.sql` — RPC atomik untuk buat grup

Migrasi akan membuat:

- Tabel `profiles`, `groups`, `group_members`, `expenses`, `expense_splits`
- Trigger auto-create profile saat user baru daftar
- Row Level Security pada semua tabel
- Bucket Storage `receipts` (privat) dengan policy upload per-user
- Function `create_group_with_members(...)` (SECURITY DEFINER, atomic)
- Function `whoami()` untuk inspeksi sesi saat troubleshooting

### 4. Konfigurasi Auth (opsional tapi disarankan)

Di **Authentication → Providers → Email**, matikan opsi **Confirm email** kalau mau langsung login tanpa verifikasi (cocok buat development).

### 5. Jalankan dev server

```powershell
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000), daftar akun, dan mulai bikin grup.

## Struktur folder

```
src/
├── app/
│   ├── (auth)/                  # /login, /register (tanpa bottom nav)
│   │   ├── actions.ts           # signup / signin / signout server actions
│   │   ├── login/
│   │   └── register/
│   ├── (app)/                   # rute terlindungi (dengan AppShell)
│   │   ├── page.tsx             # Beranda — saldo bersih + daftar grup
│   │   ├── groups/
│   │   │   ├── page.tsx         # Daftar semua grup
│   │   │   ├── new/             # Buat grup baru
│   │   │   ├── actions.ts       # Group server actions
│   │   │   └── [id]/
│   │   │       ├── page.tsx     # Detail grup + saran pembayaran
│   │   │       ├── settings/    # Kelola anggota, hapus grup
│   │   │       └── expenses/
│   │   │           ├── actions.ts
│   │   │           ├── new/     # Form tambah expense + scanner
│   │   │           └── [expenseId]/
│   │   ├── history/             # Riwayat semua transaksi
│   │   └── profile/
│   ├── layout.tsx               # Root layout + Toaster
│   └── globals.css              # Tailwind v4 theme tokens
├── components/
│   ├── ui/                      # Button, Card, Input, Sheet, …
│   ├── layout/                  # AppShell, BottomNav, PageHeader
│   └── scan/                    # ReceiptScanner (Tesseract)
├── lib/
│   ├── supabase/                # Browser, server, middleware clients
│   ├── balances.ts              # computeSplits, computeBalances, settle
│   ├── data.ts                  # Server-only data layer (queries)
│   └── utils.ts                 # cn, formatRupiah, initials, …
├── types/database.ts            # Skema tabel Supabase
└── middleware.ts                # Refresh session + redirect auth

supabase/
└── migrations/0001_init.sql     # Skema awal & RLS policies
```

## Deploy ke Vercel

1. Push project ke GitHub.
2. Di [vercel.com/new](https://vercel.com/new), import repository tersebut.
3. Saat setup, isi environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klik **Deploy**. Selesai — domain `*.vercel.app` siap dipakai.
5. (Opsional) Tambah custom domain dari Vercel dashboard.

> **Catatan:** Tesseract.js dijalankan **di browser** lewat dynamic import,
> jadi binari OCR tidak ikut bundle Vercel. Saat user pertama kali scan
> nota, browser-nya akan men-download worker (~3MB) dan cache lokal.

## Bagaimana settlement dihitung?

Lihat `src/lib/balances.ts`:

1. `computeBalances` mengumpulkan saldo bersih per anggota: yang bayar diuntungkan, yang terlibat dalam split dirugikan.
2. `settle` menggunakan strategi greedy — kreditur terbesar dipasangkan dengan debitur terbesar sampai semua nol. Hasilnya jumlah transfer minimum (untuk kasus normal).

## Scripts

| Perintah              | Aksi                                              |
| --------------------- | ------------------------------------------------- |
| `npm run dev`         | Jalankan dev server (Turbopack)                   |
| `npm run build`       | Build production bundle                           |
| `npm run start`       | Jalankan hasil build                              |
| `npm run lint`        | ESLint                                            |
| `npm run typecheck`   | `tsc --noEmit`                                    |
| `npm run format`      | Prettier write semua file                         |
| `npm run format:check`| Verifikasi formatting (cocok untuk CI)            |

## Catatan keamanan

- Row Level Security aktif di seluruh tabel — user hanya bisa lihat/ubah grup yang dia miliki atau tempat dia menjadi anggota.
- Bucket `receipts` privat. URL gambar nota dibuat ad-hoc dengan `createSignedUrl` (1 jam).
- Server Actions selalu re-validasi user dengan `auth.getUser()`.
- Middleware refresh session di setiap request dan redirect user yang belum login.
