import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  FileText,
  Plus,
  Receipt,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatedNumber } from "@/components/animated-number";
import { ExpenseTimeline } from "@/components/charts/expense-timeline-loader";
import { ExpenseGroupings } from "@/components/groups/expense-groupings";
import { SettlementsCard } from "@/components/groups/settlements-card";
import { computeBalances, settle } from "@/lib/balances";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { formatRupiah } from "@/lib/utils";

import {
  confirmSettlementAction,
  markPaidAction,
  unmarkPaidAction,
} from "./settlements/actions";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, group] = await Promise.all([getCurrentUser(), getGroupDetail(id)]);
  if (!group) notFound();

  const myMember = group.members.find((m) => m.profile_id === user?.id);

  const total = group.expenses.reduce((s, e) => s + e.amount, 0);

  // Balances now factor in confirmed settlements — they reduce debt only
  // once the recipient has acknowledged the payment.
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
  const suggestions = settle(balances);
  const myNet = myMember ? balances.get(myMember.id) ?? 0 : 0;

  const pending = group.settlements.filter((s) => s.confirmed_at === null);
  const confirmed = group.settlements.filter((s) => s.confirmed_at !== null);

  return (
    <>
      <PageHeader
        title={`${group.emoji ?? "👥"} ${group.name}`}
        subtitle={`${group.members.length} anggota`}
        back
        right={
          <div className="flex items-center gap-1">
            <Link href={`/groups/${group.id}/report`} aria-label="Laporan">
              <Button size="icon" variant="ghost">
                <FileText className="size-5" />
              </Button>
            </Link>
            <Link href={`/groups/${group.id}/settings`} aria-label="Pengaturan">
              <Button size="icon" variant="ghost">
                <Settings2 className="size-5" />
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-5 px-4 py-4">
        {/* Hero — group total + my net */}
        <Card className="aurora grain relative overflow-hidden border-0 p-6 text-[var(--color-on-ink)] float-in">
          <div className="relative z-[2]">
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
              <Sparkles className="size-3.5" />
              Total pengeluaran
            </div>
            <p className="mt-2 font-display tabular text-5xl leading-none">
              <AnimatedNumber value={total} />
            </p>
            {myMember && (
              <p className="mt-3 text-sm opacity-80">
                {myNet === 0 ? (
                  "Kamu lunas dengan grup ini ✨"
                ) : myNet > 0 ? (
                  <>
                    Kamu akan{" "}
                    <span className="font-semibold text-[var(--color-accent)]">
                      terima {formatRupiah(myNet)}
                    </span>
                  </>
                ) : (
                  <>
                    Kamu masih{" "}
                    <span className="font-semibold">
                      bayar {formatRupiah(-myNet)}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        </Card>

        {/* Quick CTA → laporan. Placed up top so it doesn't drown
            under the expense list once the trip gets long. The header
            has the same icon link, but card-shaped CTAs at body width
            are far harder to miss on mobile. */}
        <Link href={`/groups/${group.id}/report`} className="block">
          <Card className="flex items-center gap-3 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
              <BarChart3 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold tracking-tight">Laporan trip</p>
              <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                Biaya per orang, breakdown kategori, sisa utang
              </p>
            </div>
            <ChevronRight className="size-4 text-[var(--color-muted-foreground)]" />
          </Card>
        </Link>

        {/* Spending chart */}
        <ExpenseTimeline
          members={group.members.map((m) => ({
            id: m.id,
            display_name: m.id === myMember?.id ? "Kamu" : m.display_name,
          }))}
          expenses={group.expenses.map((e) => ({
            amount: e.amount,
            spent_at: e.spent_at,
            // created_at is used as a fallback in timeline.ts whenever
            // spent_at lands on midnight (e.g. older rows recorded
            // before time-preservation was added).
            created_at: e.created_at,
            paid_by_member_id: e.paid_by_member_id,
            splits: e.splits,
          }))}
          variant="group"
        />

        {/* Members strip */}
        <section>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Anggota · {group.members.length}
          </h3>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 no-scrollbar">
            {group.members.map((m) => {
              const memberNet = Math.round(balances.get(m.id) ?? 0);
              return (
                <div
                  key={m.id}
                  className="flex w-20 shrink-0 flex-col items-center gap-1.5"
                >
                  <Avatar
                    name={m.display_name}
                    size="lg"
                    className="ring-2 ring-[var(--color-card)] shadow-[var(--shadow-card)]"
                  />
                  <p className="w-full truncate text-center text-[11px] font-medium">
                    {m.id === myMember?.id ? "Kamu" : m.display_name}
                  </p>
                  {memberNet !== 0 ? (
                    <span
                      className={
                        memberNet > 0
                          ? "tabular text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                          : "tabular text-[10px] font-semibold text-rose-600 dark:text-rose-400"
                      }
                    >
                      {memberNet > 0 ? "+" : "−"}
                      {formatRupiah(Math.abs(memberNet)).replace("Rp", "")}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-[var(--color-muted-foreground)]">
                      lunas
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Settlements (suggestions + pending + history) */}
        <SettlementsCard
          groupId={group.id}
          myMemberId={myMember?.id ?? null}
          isOwner={group.owner_id === user?.id}
          members={group.members}
          suggestions={suggestions}
          pending={pending}
          confirmed={confirmed}
          markPaidAction={markPaidAction}
          confirmAction={confirmSettlementAction}
          unmarkPaidAction={unmarkPaidAction}
        />

        {/* Expenses grouped by category */}
        <section>
          <header className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Pengeluaran
            </h3>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              {group.expenses.length} transaksi
            </span>
          </header>

          {group.expenses.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Receipt className="size-7" />}
                title="Belum ada pengeluaran"
                description="Catat pengeluaran pertama, atau scan nota langsung dari kamera."
                action={
                  <Link href={`/groups/${group.id}/expenses/new`}>
                    <Button variant="accent" size="sm" className="mt-2">
                      <Plus className="size-4" /> Tambah pengeluaran
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <ExpenseGroupings
              groupId={group.id}
              expenses={group.expenses.map((e) => ({
                id: e.id,
                title: e.title,
                amount: e.amount,
                spent_at: e.spent_at,
                paid_by_member_id: e.paid_by_member_id,
                category: e.category,
                splits: e.splits,
              }))}
              members={group.members}
              myMemberId={myMember?.id ?? null}
            />
          )}
        </section>

      </div>
    </>
  );
}

