import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatedNumber } from "@/components/animated-number";
import { ExpenseTimeline } from "@/components/charts/expense-timeline-loader";
import { SettlementsCard } from "@/components/groups/settlements-card";
import { computeBalances, settle } from "@/lib/balances";
import { CATEGORIES, categoryEmoji, categoryLabel } from "@/lib/categories";
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

  const memberMap = new Map(group.members.map((m) => [m.id, m]));
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

  // Group expenses by category for the rolled-up view. "" key holds
  // expenses without a category set.
  const expensesByCategory = new Map<string, typeof group.expenses>();
  for (const e of group.expenses) {
    const key = e.category ?? "";
    const arr = expensesByCategory.get(key) ?? [];
    arr.push(e);
    expensesByCategory.set(key, arr);
  }
  // Order categories by total spend, descending
  const orderedCategories = Array.from(expensesByCategory.entries())
    .map(([slug, items]) => ({
      slug,
      items,
      total: items.reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.total - a.total);

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
            <div className="space-y-2.5">
              {orderedCategories.map(({ slug, items, total: catTotal }) => (
                <CategoryGroup
                  key={slug || "uncategorized"}
                  groupId={group.id}
                  slug={slug}
                  total={catTotal}
                  items={items}
                  memberMap={memberMap}
                  myMemberId={myMember?.id ?? null}
                />
              ))}
            </div>
          )}
        </section>

        <Link href={`/groups/${group.id}/report`} className="block">
          <Card className="flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--color-muted)] text-[var(--color-foreground)]">
              <BarChart3 className="size-5" />
            </span>
            <div className="flex-1">
              <p className="font-semibold tracking-tight">Lihat laporan trip</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Biaya per orang, breakdown kategori, total trip
              </p>
            </div>
            <ChevronRight className="size-4 text-[var(--color-muted-foreground)]" />
          </Card>
        </Link>
      </div>
    </>
  );
}

/**
 * One category bucket. Collapsible so the expense list doesn't blow up
 * to dozens of rows on a long trip — the category total is always
 * visible. Defaults open if there are 3 or fewer items in the bucket
 * so single-item categories aren't hidden behind a tap.
 */
function CategoryGroup({
  groupId,
  slug,
  total,
  items,
  memberMap,
  myMemberId,
}: {
  groupId: string;
  slug: string;
  total: number;
  items: {
    id: string;
    title: string;
    amount: number;
    spent_at: string;
    paid_by_member_id: string;
    splits: { member_id: string; amount: number }[];
  }[];
  memberMap: Map<
    string,
    { id: string; display_name: string; profile_id: string | null }
  >;
  myMemberId: string | null;
}) {
  const label = slug ? categoryLabel(slug) : "Tanpa kategori";
  const emoji = slug ? categoryEmoji(slug) : "📦";
  const defaultOpen = items.length <= 3;

  return (
    <details open={defaultOpen} className="group">
      <summary className="list-none cursor-pointer">
        <Card className="flex items-center gap-3 p-3.5 transition-all duration-200 hover:bg-[var(--color-muted)]">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-xl">
            {emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold tracking-tight">{label}</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              {items.length} transaksi
            </p>
          </div>
          <p className="tabular shrink-0 font-semibold text-sm">
            {formatRupiah(total)}
          </p>
          <ChevronRight className="size-4 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-90" />
        </Card>
      </summary>
      <ul className="mt-1.5 space-y-1.5 pl-2">
        {items.map((e) => {
          const payer = memberMap.get(e.paid_by_member_id);
          const myShare =
            e.splits.find((s) => s.member_id === myMemberId)?.amount ?? 0;
          return (
            <li key={e.id}>
              <Link href={`/groups/${groupId}/expenses/${e.id}`}>
                <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-[var(--color-muted)]">
                  <Avatar name={payer?.display_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">
                      {e.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                      {payer?.id === myMemberId ? "Kamu" : payer?.display_name}{" "}
                      bayar ·{" "}
                      {format(new Date(e.spent_at), "d MMM", {
                        locale: idLocale,
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold">
                      {formatRupiah(e.amount)}
                    </p>
                    {myMemberId && myShare > 0 && (
                      <Badge
                        variant={
                          payer?.id === myMemberId ? "success" : "secondary"
                        }
                        className="tabular mt-1 text-[10px]"
                      >
                        {payer?.id === myMemberId
                          ? `+${formatRupiah(e.amount - myShare)}`
                          : `−${formatRupiah(myShare)}`}
                      </Badge>
                    )}
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// silence unused-import warnings for the side-effect of pulling preset list
void CATEGORIES;
