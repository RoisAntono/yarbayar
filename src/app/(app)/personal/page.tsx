import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
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

export default async function PersonalPage() {
  const user = await getCurrentUser();
  const [items, summary, profile] = await Promise.all([
    getPersonalExpenses(200),
    getMonthlySummary(),
    user ? getProfile(user.id) : Promise.resolve(null),
  ]);

  const isPositive = summary.net >= 0;
  // Personal page = pure user-scope, semua angka pakai user.currency.
  const userCurrency = getCurrencyConfig(profile?.currency).code;

  return (
    <>
      <PageHeader
        title="Catatan keuangan"
        subtitle={
          summary.count > 0
            ? `Bulan ini · ${isPositive ? "+" : "−"}${formatMoney(Math.abs(summary.net), userCurrency)}`
            : "Pemasukan & pengeluaran kamu"
        }
      />

      <div className="space-y-5 px-4 py-4">
        {/* Hero card aurora — net cashflow ditampilkan paling besar.
            Income > expense → angka hijau dengan + prefix; sebaliknya
            angka merah dengan -. Ini kayak "balance" di mobile banking,
            nuansa Gen-Z friendly. */}
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
                atasnya. Ini tradeoff yang acceptable selama group
                currency belum exposed ke UI. */}
            {summary.group_share_total > 0 && (
              <p className="mt-2 text-[10px] opacity-60">
                Termasuk {formatMoney(summary.group_share_total, userCurrency)} bagian di
                grup
              </p>
            )}
          </div>
        </Card>

        {/* Two add buttons side-by-side. Color-coded sesuai semantik
            yang sama dengan toggle picker di form: pengeluaran
            destructive (merah), pemasukan success (hijau). Konsisten
            di seluruh app — kalau di sini saffron, user bingung kenapa
            di form jadi merah saat udah masuk. */}
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

        {/* List */}
        {items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Wallet className="size-7" />}
              title="Belum ada catatan"
              description="Tap salah satu tombol di atas buat mulai."
            />
          </Card>
        ) : (
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
        )}
      </div>
    </>
  );
}
