import { Suspense, cache } from "react";
import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrencyConfig } from "@/lib/currency";
import {
  getCurrentUser,
  getMonthlySummary,
  getProfile,
  getUnifiedExpenses,
} from "@/lib/data";
import { formatMoney } from "@/lib/utils";
import { HistoryList } from "./history-list";

export const metadata = { title: "Riwayat" };
export const dynamic = "force-dynamic";

/**
 * Cached fetchers — sama pattern dengan Beranda + /personal.
 * `getProfile` dipakai di header subtitle DAN BreakdownChips DAN
 * `HistoryList` (untuk currency render) — wajib dedup.
 */
const fetchProfile = cache(getProfile);
const fetchSummary = cache(getMonthlySummary);
const fetchExpenses = cache((limit: number) => getUnifiedExpenses(limit));

/**
 * /history — Riwayat unified (personal + share di group).
 *
 * Refactor: shell + 3 Suspense boundary independent.
 *   - HistoryHeader (subtitle dengan total) — small fetch
 *   - BreakdownChips (summary + currency) — chip atas
 *   - HistoryListSection (200 expense rows + currency) — biggest fetch
 *
 * Pattern principle:
 *   getUnifiedExpenses(200) di list section bisa makan ~300ms (joins
 *   personal_expenses + group expenses). User udah lihat header +
 *   chips dulu, baru calendar/list nyusul.
 */
export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const userId = user.id;

  return (
    <>
      <Suspense
        fallback={
          <PageHeader title="Riwayat" subtitle="Pengeluaran pribadi & grup" />
        }
      >
        <HistoryHeader userId={userId} />
      </Suspense>

      <div className="space-y-6 px-4 py-4">
        {/* Monthly breakdown chips — only when has data */}
        <Suspense fallback={<BreakdownChipsSkeleton />}>
          <BreakdownChips userId={userId} />
        </Suspense>

        {/* Calendar + list — biggest fetch, last to land */}
        <Suspense fallback={<HistoryListSkeleton />}>
          <HistoryListSection userId={userId} />
        </Suspense>
      </div>
    </>
  );
}

// ---------------------------------------------------------------
// Async section components
// ---------------------------------------------------------------

async function HistoryHeader({ userId }: { userId: string }) {
  const [summary, profile] = await Promise.all([
    fetchSummary(),
    fetchProfile(userId),
  ]);
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
    <PageHeader
      title="Riwayat"
      subtitle={
        summary.count > 0
          ? `Bulan ini · ${formatMoney(summary.total, userCurrency)}`
          : "Pengeluaran pribadi & grup"
      }
    />
  );
}

async function BreakdownChips({ userId }: { userId: string }) {
  const [summary, profile] = await Promise.all([
    fetchSummary(),
    fetchProfile(userId),
  ]);

  // Hide chips kalau bulan ini kosong — sesuai behavior lama. Suspense
  // skeleton di atas tetap reserve space sebentar lalu hilang. Trade-off
  // acceptable untuk simplicity.
  if (summary.count === 0) return null;

  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
    <div className="flex gap-2">
      <BreakdownChip
        label="Pribadi"
        amount={summary.personal_total}
        currency={userCurrency}
        accent
      />
      <BreakdownChip
        label="Bagian di grup"
        amount={summary.group_share_total}
        currency={userCurrency}
      />
    </div>
  );
}

async function HistoryListSection({ userId }: { userId: string }) {
  const [expenses, profile] = await Promise.all([
    fetchExpenses(200),
    fetchProfile(userId),
  ]);
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  if (expenses.length === 0) {
    return (
      <Card className="float-in">
        <EmptyState
          icon={<Receipt className="size-7" />}
          title="Belum ada transaksi"
          description="Catatan pribadi & bagian di grup akan muncul di sini."
        />
      </Card>
    );
  }

  return <HistoryList expenses={expenses} currency={userCurrency} />;
}

// ---------------------------------------------------------------
// Skeleton fallbacks (CLS ≈ 0)
// ---------------------------------------------------------------

function BreakdownChipsSkeleton() {
  return (
    <div className="flex gap-2">
      <Skeleton className="h-[60px] flex-1 rounded-2xl" />
      <Skeleton className="h-[60px] flex-1 rounded-2xl" />
    </div>
  );
}

function HistoryListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton — match calendar toolbar dimension */}
      <Card className="flex items-center gap-2 p-2">
        <div className="flex flex-1 items-center gap-2.5 px-2 py-1.5">
          <Skeleton className="size-9 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 border-l border-[var(--color-border)] pl-1">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="size-8 rounded-xl" />
        </div>
      </Card>
      {/* Day header skeleton */}
      <div className="flex items-baseline justify-between px-1">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* 4 row skeleton */}
      <ul className="space-y-1.5">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <Card className="flex items-center gap-3 p-3.5">
              <Skeleton className="size-10 shrink-0 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
              <Skeleton className="h-4 w-20 shrink-0" />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------
// Pure presentational
// ---------------------------------------------------------------

/** Small pill showing a breakdown number — used in monthly summary. */
function BreakdownChip({
  label,
  amount,
  currency,
  accent,
}: {
  label: string;
  amount: number;
  currency: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={
        accent
          ? "flex-1 border-0 bg-[color-mix(in_oklab,var(--color-accent),transparent_85%)] p-3"
          : "flex-1 p-3"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="tabular mt-0.5 text-sm font-semibold tracking-tight">
        {formatMoney(amount, currency)}
      </p>
    </Card>
  );
}
