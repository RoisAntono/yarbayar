import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowRight, Calendar, Sparkles, Users, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { computeBalances, settle } from "@/lib/balances";
import { categoryEmoji, categoryLabel } from "@/lib/categories";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { formatRupiah } from "@/lib/utils";

export const metadata = { title: "Laporan trip" };
export const dynamic = "force-dynamic";

export default async function GroupReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, group] = await Promise.all([getCurrentUser(), getGroupDetail(id)]);
  if (!group) notFound();

  const memberMap = new Map(group.members.map((m) => [m.id, m]));
  const myMember = group.members.find((m) => m.profile_id === user?.id);

  const total = group.expenses.reduce((s, e) => s + e.amount, 0);
  const perPerson = group.members.length > 0 ? total / group.members.length : 0;

  // Spend per member (sum of their splits) and what they paid up-front.
  const spentByMember = new Map<string, number>();
  const paidByMember = new Map<string, number>();
  for (const e of group.expenses) {
    paidByMember.set(
      e.paid_by_member_id,
      (paidByMember.get(e.paid_by_member_id) ?? 0) + e.amount
    );
    for (const s of e.splits) {
      spentByMember.set(s.member_id, (spentByMember.get(s.member_id) ?? 0) + s.amount);
    }
  }

  const balances = computeBalances(
    group.expenses.map((e) => ({
      amount: e.amount,
      paidByMemberId: e.paid_by_member_id,
      splits: e.splits.map((s) => ({ memberId: s.member_id, amount: s.amount })),
    })),
    group.settlements.map((s) => ({
      fromMemberId: s.from_member_id,
      toMemberId: s.to_member_id,
      amount: s.amount,
      confirmed: s.confirmed_at !== null,
    }))
  );
  const remainingTransfers = settle(balances);

  // Category breakdown
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const e of group.expenses) {
    const key = e.category ?? "";
    const cur = byCategory.get(key) ?? { total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    byCategory.set(key, cur);
  }
  const categoryRows = Array.from(byCategory.entries())
    .map(([slug, v]) => ({
      slug,
      label: slug ? categoryLabel(slug) : "Tanpa kategori",
      emoji: slug ? categoryEmoji(slug) : "📦",
      total: v.total,
      count: v.count,
      pct: total > 0 ? (v.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Trip date span
  const dates = group.expenses.map((e) => new Date(e.spent_at).getTime()).sort();
  const firstDate = dates[0] ? new Date(dates[0]) : null;
  const lastDate = dates.at(-1) ? new Date(dates.at(-1)!) : null;
  const tripDays =
    firstDate && lastDate
      ? Math.max(
          1,
          Math.round(
            (lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)
          ) + 1
        )
      : 0;

  return (
    <>
      <PageHeader
        title="Laporan trip"
        subtitle={`${group.emoji ?? "👥"} ${group.name}`}
        back
      />
      <div className="space-y-5 px-4 py-4">
        {/* Summary hero */}
        <Card className="aurora grain relative overflow-hidden border-0 p-6 text-[var(--color-on-ink)] float-in">
          <div className="relative z-[2]">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
              <Sparkles className="size-3.5" />
              Total trip
            </div>
            <p className="mt-2 font-display tabular text-5xl leading-none">
              {formatRupiah(total)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-md">
                <div className="flex items-center gap-1.5 opacity-80">
                  <Users className="size-3" /> Per orang
                </div>
                <p className="tabular mt-1 text-base font-semibold">
                  {formatRupiah(Math.round(perPerson))}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-md">
                <div className="flex items-center gap-1.5 opacity-80">
                  <Calendar className="size-3" /> Lama trip
                </div>
                <p className="tabular mt-1 text-base font-semibold">
                  {tripDays > 0 ? `${tripDays} hari` : "—"}
                </p>
              </div>
            </div>
            {firstDate && lastDate && (
              <p className="mt-3 text-xs opacity-75">
                {format(firstDate, "d MMM yyyy", { locale: idLocale })} —{" "}
                {format(lastDate, "d MMM yyyy", { locale: idLocale })}
              </p>
            )}
          </div>
        </Card>

        {/* Per-member breakdown */}
        <section>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Biaya per orang
          </h3>
          <Card className="divide-y divide-[var(--color-border)]">
            {group.members.map((m) => {
              const spent = Math.round(spentByMember.get(m.id) ?? 0);
              const paid = Math.round(paidByMember.get(m.id) ?? 0);
              const net = Math.round(balances.get(m.id) ?? 0);
              return (
                <div key={m.id} className="flex items-center gap-3 p-4">
                  <Avatar name={m.display_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {m.id === myMember?.id ? "Kamu" : m.display_name}
                    </p>
                    <p className="tabular mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                      Konsumsi {formatRupiah(spent)} · Bayar {formatRupiah(paid)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {net === 0 ? (
                      <span className="text-xs font-semibold text-[var(--color-muted-foreground)]">
                        Lunas
                      </span>
                    ) : net > 0 ? (
                      <span className="tabular text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        +{formatRupiah(net)}
                      </span>
                    ) : (
                      <span className="tabular text-sm font-semibold text-rose-600 dark:text-rose-400">
                        −{formatRupiah(-net)}
                      </span>
                    )}
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]/70">
                      {net > 0 ? "diterima" : net < 0 ? "dibayar" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>

        {/* Category breakdown with progress bars */}
        {categoryRows.length > 0 && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Breakdown kategori
            </h3>
            <Card className="space-y-3 p-4">
              {categoryRows.map((row) => (
                <div key={row.slug || "uncategorized"} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-base leading-none">
                      {row.emoji}
                    </span>
                    <p className="flex-1 text-sm font-medium">{row.label}</p>
                    <p className="tabular text-sm font-semibold">
                      {formatRupiah(row.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${row.pct.toFixed(1)}%` }}
                      />
                    </div>
                    <p className="tabular w-12 shrink-0 text-right text-[11px] font-medium text-[var(--color-muted-foreground)]">
                      {row.pct.toFixed(0)}%
                    </p>
                  </div>
                  <p className="text-[11px] text-[var(--color-muted-foreground)]">
                    {row.count} transaksi
                  </p>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* Outstanding (after confirmed settlements) */}
        {remainingTransfers.length > 0 && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Sisa utang antar anggota
            </h3>
            <Card className="divide-y divide-[var(--color-border)]">
              {remainingTransfers.map((s, i) => {
                const from = memberMap.get(s.fromMemberId);
                const to = memberMap.get(s.toMemberId);
                if (!from || !to) return null;
                return (
                  <div
                    key={`${s.fromMemberId}-${s.toMemberId}-${i}`}
                    className="flex items-center gap-3 p-3.5"
                  >
                    <Avatar name={from.display_name} size="sm" />
                    <ArrowRight className="size-4 text-[var(--color-muted-foreground)]" />
                    <Avatar name={to.display_name} size="sm" />
                    <p className="flex-1 text-sm">
                      <span className="font-semibold">
                        {from.id === myMember?.id ? "Kamu" : from.display_name}
                      </span>{" "}
                      ke{" "}
                      <span className="font-semibold">
                        {to.id === myMember?.id ? "kamu" : to.display_name}
                      </span>
                    </p>
                    <span className="tabular text-sm font-semibold">
                      {formatRupiah(s.amount)}
                    </span>
                  </div>
                );
              })}
            </Card>
          </section>
        )}

        {/* Confirmed settlement history */}
        {group.settlements.filter((s) => s.confirmed_at).length > 0 && (
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Riwayat pelunasan
            </h3>
            <Card className="divide-y divide-[var(--color-border)]">
              {group.settlements
                .filter((s) => s.confirmed_at)
                .map((s) => {
                  const from = memberMap.get(s.from_member_id);
                  const to = memberMap.get(s.to_member_id);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3.5">
                      <Wallet className="size-4 text-[var(--color-muted-foreground)]" />
                      <p className="min-w-0 flex-1 text-sm">
                        <span className="font-semibold">
                          {from?.id === myMember?.id ? "Kamu" : from?.display_name}
                        </span>{" "}
                        →{" "}
                        <span className="font-semibold">
                          {to?.id === myMember?.id ? "kamu" : to?.display_name}
                        </span>
                        <span className="ml-1 text-[11px] text-[var(--color-muted-foreground)]">
                          ·{" "}
                          {format(new Date(s.confirmed_at!), "d MMM", {
                            locale: idLocale,
                          })}
                        </span>
                      </p>
                      <span className="tabular text-sm font-semibold">
                        {formatRupiah(s.amount)}
                      </span>
                    </div>
                  );
                })}
            </Card>
          </section>
        )}
      </div>
    </>
  );
}
