import { Receipt } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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

export default async function HistoryPage() {
  // Riwayat sekarang unified: pengeluaran pribadi + share user di
  // group expenses, semuanya tampil di kalender yang sama. 200 entries
  // adalah angka yang aman untuk render snappy tanpa pagination.
  const user = await getCurrentUser();
  const [expenses, summary, profile] = await Promise.all([
    getUnifiedExpenses(200),
    getMonthlySummary(),
    user ? getProfile(user.id) : Promise.resolve(null),
  ]);
  // History page agregat user-scope, semua angka pakai user.currency.
  // Group rows yang muncul di list tampil dengan currency user juga
  // — semantic-nya "berapa kontribusi kamu di grup ini" (bukan "berapa
  // total grup"). Konsisten dengan personal-form yang stored amount.
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
    <>
      <PageHeader
        title="Riwayat"
        subtitle={
          summary.count > 0
            ? `Bulan ini · ${formatMoney(summary.total, userCurrency)}`
            : "Pengeluaran pribadi & grup"
        }
      />
      <div className="space-y-6 px-4 py-4">
        {/* Monthly breakdown chip — only when there's data this month.
            Helps user see at a glance "berapa duit aku di personal vs
            yang ditanggung di grup" without scrolling through list. */}
        {summary.count > 0 && (
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
        )}

        {expenses.length === 0 ? (
          <Card className="float-in">
            <EmptyState
              icon={<Receipt className="size-7" />}
              title="Belum ada transaksi"
              description="Catatan pribadi & bagian di grup akan muncul di sini."
            />
          </Card>
        ) : (
          <HistoryList expenses={expenses} currency={userCurrency} />
        )}
      </div>
    </>
  );
}

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
