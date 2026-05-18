import { Suspense, cache } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Sparkles, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrencyConfig } from "@/lib/currency";
import {
  getCurrentUser,
  getMonthlySummary,
  getPersonalExpenses,
  getProfile,
} from "@/lib/data";
import { cn, formatMoney } from "@/lib/utils";
import { categoryLabel, categoryEmoji } from "@/lib/categories";

export const metadata = { title: "Catatan Keuangan" };
export const dynamic = "force-dynamic";

/**
 * Cached fetchers untuk dedup per-request.
 *
 * Pattern sama dengan Beranda: profile dipakai di PageHeader subtitle
 * (untuk currency) DAN HeroCard (cashflow render). Tanpa cache, dua
 * Supabase round-trip terpisah.
 */
const fetchProfile = cache(getProfile);
const fetchSummary = cache(getMonthlySummary);
const fetchPersonal = cache((limit: number) => getPersonalExpenses(limit));

/**
 * /personal — Catatan keuangan personal.
 *
 * Refactor: shell + 3 Suspense boundary independent.
 *   - HeaderSubtitle (profile.currency + summary.net) — small fetch
 *   - HeroCashflow (summary + profile) — cashflow card
 *   - PersonalList (expenses, dedicated query)
 *
 * Quick action buttons (Pengeluaran/Pemasukan) static — selalu
 * visible langsung sebagai shell. List header juga static, cuma
 * baris-row yang Suspended.
 */
export default async function PersonalPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const userId = user.id;

  return (
    <>
      <Suspense
        fallback={
          <PageHeader
            title="Catatan keuangan"
            subtitle="Pemasukan & pengeluaran kamu"
          />
        }
      >
        <PersonalHeader userId={userId} />
      </Suspense>

      <div className="space-y-5 px-4 py-4">
        {/* Hero cashflow card — primary data */}
        <Suspense fallback={<HeroCashflowSkeleton />}>
          <HeroCashflow userId={userId} />
        </Suspense>

        {/* Goal progress card — opt-in. Tampil sebagai empty CTA
            kalau user belum set target, atau sebagai progress bar
            kalau sudah. Independen dari HeroCashflow supaya kalau goal
            data belum ready, hero ngga diblokir. */}
        <Suspense fallback={<GoalCardSkeleton />}>
          <GoalCard userId={userId} />
        </Suspense>

        {/* Quick add buttons — static, no fetch needed */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link href="/personal/new" className="block">
            <Button
              size="lg"
              className="w-full gap-2 bg-[var(--color-destructive)] text-white hover:bg-[var(--color-destructive)]/90"
              aria-label="Tambah pengeluaran"
            >
              <ArrowUpRight className="size-4" /> Pengeluaran
            </Button>
          </Link>
          <Link href="/personal/new?kind=income" className="block">
            <Button
              size="lg"
              className="w-full gap-2 bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]/90"
              aria-label="Tambah pemasukan"
            >
              <ArrowDownLeft className="size-4" /> Pemasukan
            </Button>
          </Link>
        </div>

        {/* List section — header static, rows streamed */}
        <Suspense fallback={<PersonalListSkeleton />}>
          <PersonalList userId={userId} />
        </Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// Async section components
// ---------------------------------------------------------------

async function PersonalHeader({ userId }: { userId: string }) {
  const [summary, profile] = await Promise.all([
    fetchSummary(),
    fetchProfile(userId),
  ]);
  const isPositive = summary.net >= 0;
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
    <PageHeader
      title="Catatan keuangan"
      subtitle={
        summary.count > 0
          ? `Bulan ini · ${isPositive ? "+" : "−"}${formatMoney(Math.abs(summary.net), userCurrency)}`
          : "Pemasukan & pengeluaran kamu"
      }
    />
  );
}

async function HeroCashflow({ userId }: { userId: string }) {
  const [summary, profile] = await Promise.all([
    fetchSummary(),
    fetchProfile(userId),
  ]);
  const isPositive = summary.net >= 0;
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
    <Card className="aurora grain relative overflow-hidden border-0 p-5 text-[var(--color-on-ink)] float-in">
      <div className="relative z-[2]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
          Cashflow bulan ini
        </p>
        {/* Net cashflow — positive hijau (success), negative
            merah (destructive). Saffron-on-aurora dipake di
            tempat lain sebagai brand accent; di sini context-nya
            semantic, bukan brand. */}
        <p
          className={cn(
            "font-display mt-1 text-3xl tracking-tight",
            summary.net > 0
              ? "text-[var(--color-success)]"
              : summary.net < 0
                ? "text-[var(--color-destructive)]"
                : ""
          )}
        >
          {summary.net > 0 ? "+" : summary.net < 0 ? "−" : ""}
          {formatMoney(Math.abs(summary.net), userCurrency)}
        </p>
        {/* Tone empatik, bukan menyalahkan. Defisit itu fact-of-life,
            ngga perlu di-shame. Surplus juga ngga perlu over-eksposisi
            "GREAT JOB!". Cukup neutral signaling. */}
        <p className="mt-1 text-xs opacity-70">
          {summary.net === 0
            ? "Pas — pemasukan = pengeluaran"
            : isPositive
              ? "Pemasukan > pengeluaran"
              : "Pengeluaran > pemasukan"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-1.5 opacity-80">
              <ArrowDownLeft className="size-3" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Masuk
              </span>
            </div>
            <p className="tabular mt-0.5 text-sm font-semibold">
              {formatMoney(summary.income_total, userCurrency)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
            <div className="flex items-center gap-1.5 opacity-80">
              <ArrowUpRight className="size-3" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Keluar
              </span>
            </div>
            <p className="tabular mt-0.5 text-sm font-semibold">
              {formatMoney(summary.total, userCurrency)}
            </p>
          </div>
        </div>

        {/* Group share sub-line — kalau user juga aktif di grup.
            Note: nilai ini sebenarnya dari group expenses yang
            technically punya currency sendiri (default IDR), tapi
            di context "cashflow personal kamu" lebih masuk akal
            pakai user currency biar konsisten dengan baris di
            atasnya. */}
        {summary.group_share_total > 0 && (
          <p className="mt-2 text-[10px] opacity-60">
            Termasuk {formatMoney(summary.group_share_total, userCurrency)} bagian di
            grup
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * Goal progress card — render 4 state berdasarkan net vs target:
 *
 *   1. NULL target  → empty state CTA "Set target nabung"
 *   2. net >= target → milestone state "🎉 Target tercapai"
 *   3. 0 < net < target → progress bar dengan persentase
 *   4. net <= 0 → defisit state, gentle reframe "Mungkin target lebih realistis?"
 *
 * Tone empatik (lihat AGENTS.md microcopy guidelines): tidak
 * shame user di kondisi defisit, tidak over-cheery di kondisi sukses.
 */
async function GoalCard({ userId }: { userId: string }) {
  const [summary, profile] = await Promise.all([
    fetchSummary(),
    fetchProfile(userId),
  ]);
  const userCurrency = getCurrencyConfig(profile?.currency).code;
  const target = profile?.monthly_savings_target ?? null;

  // State 1: belum set target. Empty CTA dengan link ke picker.
  if (target === null || target === 0) {
    return (
      <Link href="/profile/goal" className="block">
        <Card className="group flex items-center gap-3 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] text-[var(--color-accent)]">
            <Target className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-tight">Set target nabung</p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
              Pasang goal bulanan, lihat progress di sini
            </p>
          </div>
          <span className="text-[var(--color-muted-foreground)] transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Card>
      </Link>
    );
  }

  const net = summary.net;
  const pct = Math.max(0, Math.min(100, (net / target) * 100));
  const reached = net >= target;
  const onTrack = net > 0 && net < target;
  const noProgress = net === 0;
  const deficit = net < 0;

  return (
    <Card className="space-y-3 p-4">
      {/* Header row — label + status badge ringkas */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-[var(--color-muted)] text-[var(--color-foreground)]">
            <Target className="size-4" />
          </span>
          <p className="text-sm font-semibold tracking-tight">Target nabung bulan ini</p>
        </div>
        <Link
          href="/profile/goal"
          className="text-[10px] font-medium text-[var(--color-muted-foreground)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
        >
          Ubah
        </Link>
      </div>

      {/* Progress bar. Width = clamp(0,100). Color berubah berdasarkan
          state: success kalau reached/on-track, destructive kalau
          defisit. Background bar selalu muted. */}
      <div className="space-y-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]">
          <div
            className={
              reached
                ? "h-full rounded-full bg-[var(--color-success)] transition-all duration-500"
                : deficit
                  ? "h-full rounded-full bg-[var(--color-destructive)] transition-all duration-500"
                  : "h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
            }
            style={{ width: `${reached ? 100 : pct}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="tabular font-semibold">
            {net >= 0
              ? formatMoney(Math.round(net), userCurrency)
              : `−${formatMoney(Math.abs(Math.round(net)), userCurrency)}`}
          </span>
          <span className="tabular text-[var(--color-muted-foreground)]">
            dari {formatMoney(target, userCurrency)}
          </span>
        </div>
      </div>

      {/* Status copy — empatik di setiap kondisi. Lihat
          AGENTS.md microcopy "Empati di kondisi negatif". */}
      <p
        className={cn(
          "text-xs leading-relaxed",
          reached
            ? "text-[var(--color-success)]"
            : deficit
              ? "text-[var(--color-destructive)]"
              : "text-[var(--color-muted-foreground)]"
        )}
      >
        {reached ? (
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-3.5" />
            Target tercapai. Lebih{" "}
            {formatMoney(Math.round(net - target), userCurrency)} dari target.
          </span>
        ) : onTrack ? (
          <>
            Tinggal{" "}
            <span className="tabular font-semibold text-[var(--color-foreground)]">
              {formatMoney(Math.round(target - net), userCurrency)}
            </span>{" "}
            lagi · {pct.toFixed(0)}% dari target.
          </>
        ) : noProgress ? (
          <>Belum ada surplus bulan ini. Target masih utuh.</>
        ) : (
          // Defisit — frame sebagai "fact-of-life" + gentle suggest
          // adjust target. Bukan menyalahkan, bukan menggurui.
          <>
            Defisit{" "}
            <span className="tabular font-semibold">
              {formatMoney(Math.abs(Math.round(net)), userCurrency)}
            </span>{" "}
            bulan ini. Mungkin set target lebih kecil?
          </>
        )}
      </p>
    </Card>
  );
}

async function PersonalList({ userId }: { userId: string }) {
  const [items, profile] = await Promise.all([
    fetchPersonal(200),
    fetchProfile(userId),
  ]);
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Wallet className="size-7" />}
          title="Belum ada catatan"
          description="Tap salah satu tombol di atas buat mulai."
        />
      </Card>
    );
  }

  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
          Terbaru
        </h3>
        <Link
          href="/history"
          className="text-[11px] font-medium text-[var(--color-muted-foreground)] underline-offset-2 hover:text-[var(--color-foreground)] hover:underline"
        >
          Riwayat lengkap →
        </Link>
      </header>
      <Card className="divide-y divide-[var(--color-border)]">
        {items.map((it) => {
          const isIncome = it.kind === "income";
          return (
            <Link
              key={it.id}
              href={`/personal/${it.id}/edit`}
              className="flex items-center gap-3 p-3.5 transition-colors hover:bg-[var(--color-muted)]"
            >
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-2xl text-base",
                  isIncome
                    ? "bg-[color-mix(in_oklab,var(--color-success),transparent_85%)] text-[var(--color-success)]"
                    : "bg-[var(--color-muted)]"
                )}
              >
                {isIncome ? (
                  <ArrowDownLeft className="size-4" />
                ) : (
                  categoryEmoji(it.category)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-tight">
                  {it.title}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-muted-foreground)]">
                  {isIncome ? "Pemasukan" : categoryLabel(it.category)} ·{" "}
                  {format(new Date(it.spent_at), "d MMM, HH:mm", {
                    locale: idLocale,
                  })}
                </p>
              </div>
              <p
                className={cn(
                  "tabular shrink-0 text-sm font-semibold",
                  isIncome && "text-[var(--color-success)]"
                )}
              >
                {isIncome ? "+" : ""}
                {formatMoney(it.amount, userCurrency)}
              </p>
            </Link>
          );
        })}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------
// Skeleton fallbacks — match dimensi card asli (CLS ≈ 0)
// ---------------------------------------------------------------

function HeroCashflowSkeleton() {
  return (
    <Card className="aurora grain relative overflow-hidden border-0 p-5 text-[var(--color-on-ink)]">
      <div className="relative z-[2] space-y-2">
        <Skeleton className="h-3 w-32 bg-white/15" />
        <Skeleton className="h-9 w-44 bg-white/15" />
        <Skeleton className="h-3 w-36 bg-white/15" />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Skeleton className="h-[52px] rounded-xl bg-white/15" />
          <Skeleton className="h-[52px] rounded-xl bg-white/15" />
        </div>
      </div>
    </Card>
  );
}

function GoalCardSkeleton() {
  // Match dimensi compact (kalau goal belum di-set: 1-row link card,
  // ~3rem) atau full progress card (~7rem). Pakai full skeleton biar
  // covers kedua state — kalau goal-belum-set, height shrinks setelah
  // load tapi tidak menyebabkan layout shift karena card di atas hero
  // tetap di posisi sama.
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="size-8 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex items-baseline justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3 w-3/4" />
    </Card>
  );
}

function PersonalListSkeleton() {
  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between px-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-24" />
      </header>
      <Card className="divide-y divide-[var(--color-border)]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3.5">
            <Skeleton className="size-10 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-4 w-20 shrink-0" />
          </div>
        ))}
      </Card>
    </section>
  );
}
