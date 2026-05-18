import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowRight, Calendar, ChevronRight, Sparkles, Users, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { computeBalances, settle } from "@/lib/balances";
import { categoryEmoji, categoryLabel } from "@/lib/categories";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { formatMoney } from "@/lib/utils";

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

  // Local shorthand — semua amount di laporan ini render dengan
  // currency grup. Bikin helper di scope page level supaya callsite
  // tetap pendek tanpa pass currency tiap kali.
  const fmt = (n: number) => formatMoney(n, group.currency);

  const total = group.expenses.reduce((s, e) => s + e.amount, 0);

  // ---------------------------------------------------------------
  // PER-MEMBER NUMBERS THAT REFLECT REAL DATA (not averages)
  //
  //   paidByMember     → uang yang member talangin dari kantong
  //                      (sum of expenses where they're paid_by)
  //   consumedByMember → porsi mereka di expense splits
  //                      (sum of splits[].amount where member_id = them)
  //
  // If user 1 paid 455k and there's no split assigned to anyone else,
  // that means user 1 also consumed all of it (their split is the full
  // amount), so paid - consumed = 0 → no debt. The math handles "fully
  // personal expenses" correctly without any special case.
  // ---------------------------------------------------------------
  const paidByMember = new Map<string, number>();
  const consumedByMember = new Map<string, number>();
  for (const e of group.expenses) {
    paidByMember.set(
      e.paid_by_member_id,
      (paidByMember.get(e.paid_by_member_id) ?? 0) + e.amount
    );
    for (const s of e.splits) {
      consumedByMember.set(
        s.member_id,
        (consumedByMember.get(s.member_id) ?? 0) + s.amount
      );
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
              {fmt(total)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-md">
                <div className="flex items-center gap-1.5 opacity-80">
                  <Users className="size-3" /> Anggota
                </div>
                <p className="tabular mt-1 text-base font-semibold">
                  {group.members.length} orang
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

        {/*
          Per-member breakdown — redesigned for clarity.

          Earlier this card showed "Talangin" (out-of-pocket) as the
          headline number with "Konsumsi" tucked away in 10px text.
          Easy to misread "Talangin" as the person's actual share of
          the trip — it isn't. The actual share is Konsumsi.

          New layout:
            • Primary stat = Bagian (consumption / real share)
            • Secondary stat = Bayar di muka (out-of-pocket / paid up front)
            • Status = net to receive or pay back
            • Re-sorted by consumption descending so "the person who
              spent the most on themselves" appears first — that's the
              question users actually have when scanning the list.
        */}
        <section>
          <header className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Pengeluaran per orang
            </h3>
            <p className="text-[10px] text-[var(--color-muted-foreground)]/70">
              Diurutkan dari bagian terbesar
            </p>
          </header>
          {(() => {
            // Sort by consumption desc — what each person actually
            // owes for the trip, biggest first.
            const byConsumption = [...group.members].sort(
              (a, b) =>
                (consumedByMember.get(b.id) ?? 0) -
                (consumedByMember.get(a.id) ?? 0)
            );
            // Max consumption — sizes the progress bar. We bar-by
            // consumption (not paid) so the bar tracks the headline.
            const maxConsumed = Math.max(
              1,
              ...group.members.map((m) => consumedByMember.get(m.id) ?? 0)
            );

            return (
              <Card className="divide-y divide-[var(--color-border)]">
                {byConsumption.map((m) => {
                  const paid = Math.round(paidByMember.get(m.id) ?? 0);
                  const consumed = Math.round(consumedByMember.get(m.id) ?? 0);
                  const net = Math.round(balances.get(m.id) ?? 0);
                  const consumedPct = (consumed / maxConsumed) * 100;
                  const isMe = m.id === myMember?.id;

                  return (
                    <div key={m.id} className="space-y-3 p-4">
                      {/* Identity row */}
                      <div className="flex items-center gap-3">
                        <Avatar name={m.display_name} />
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {isMe ? "Kamu" : m.display_name}
                        </p>
                        {/* Status pill — same hierarchy as before but
                            tagged "Saldo" to make the number's meaning
                            unambiguous. "diterima" alone could read as
                            "income" out of context. */}
                        {net === 0 ? (
                          <span className="shrink-0 rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
                            Lunas
                          </span>
                        ) : net > 0 ? (
                          <span className="tabular shrink-0 rounded-full bg-[color-mix(in_oklab,var(--color-success),transparent_88%)] px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            akan terima +{fmt(net)}
                          </span>
                        ) : (
                          <span className="tabular shrink-0 rounded-full bg-[color-mix(in_oklab,var(--color-destructive),transparent_88%)] px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                            harus bayar {fmt(-net)}
                          </span>
                        )}
                      </div>

                      {/* Two-stat headline. Bagian (consumption) is the
                          primary, larger figure — it's what each person
                          truly "spent" on the trip. Bayar di muka is
                          secondary but still legible. */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                            Bagian
                          </p>
                          <p className="font-display tabular text-2xl font-semibold leading-tight tracking-tight">
                            {fmt(consumed)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]/80">
                            yang harusnya ditanggung
                          </p>
                        </div>
                        <div className="border-l border-[var(--color-border)] pl-3">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
                            Bayar di muka
                          </p>
                          <p className="tabular text-lg font-semibold leading-tight tracking-tight">
                            {fmt(paid)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]/80">
                            keluar dari kantong
                          </p>
                        </div>
                      </div>

                      {/* Bar = consumption relative to the biggest
                          consumer. Now matches the headline figure. */}
                      {consumed > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-muted)]">
                            <div
                              className="h-full rounded-full bg-[var(--color-accent)]"
                              style={{
                                width: `${consumedPct.toFixed(1)}%`,
                              }}
                            />
                          </div>
                          <p className="tabular shrink-0 text-[10px] text-[var(--color-muted-foreground)]/80">
                            {((consumed / total) * 100).toFixed(0)}% dari trip
                          </p>
                        </div>
                      )}
                      {consumed === 0 && paid > 0 && (
                        <p className="text-[11px] text-[var(--color-muted-foreground)]">
                          Cuma talangin{" "}
                          <span className="tabular font-semibold text-[var(--color-foreground)]">
                            {fmt(paid)}
                          </span>{" "}
                          — tidak ikut konsumsi
                        </p>
                      )}
                    </div>
                  );
                })}
              </Card>
            );
          })()}

        </section>

        {/*
          Category breakdown — collapsible. Defaults closed so the
          critical sections below ("Sisa utang", "Riwayat pelunasan")
          stay above the fold even on long trips with 10+ categories.
          The summary header still shows total category count and
          biggest spend so users can decide whether to expand.
        */}
        {categoryRows.length > 0 && (
          <details className="group">
            <summary className="list-none cursor-pointer">
              <Card className="flex items-center gap-3 p-3.5 transition-all duration-200 hover:bg-[var(--color-muted)]">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-base">
                  📊
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tracking-tight">Breakdown kategori</p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                    {categoryRows.length} kategori · terbesar{" "}
                    {categoryRows[0]?.label.toLowerCase()}
                  </p>
                </div>
                <ChevronRight className="size-4 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-90" />
              </Card>
            </summary>
            <Card className="mt-1.5 space-y-3 p-4">
              {categoryRows.map((row) => (
                <div key={row.slug || "uncategorized"} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="text-base leading-none">
                      {row.emoji}
                    </span>
                    <p className="flex-1 text-sm font-medium">{row.label}</p>
                    <p className="tabular text-sm font-semibold">
                      {fmt(row.total)}
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
          </details>
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
                      {fmt(s.amount)}
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
                        {fmt(s.amount)}
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
