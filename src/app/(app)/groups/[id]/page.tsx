import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowLeftRight,
  ArrowRight,
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
import { computeBalances, settle } from "@/lib/balances";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { formatRupiah } from "@/lib/utils";

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
  const balances = computeBalances(
    group.expenses.map((e) => ({
      amount: e.amount,
      paidByMemberId: e.paid_by_member_id,
      splits: e.splits.map((s) => ({ memberId: s.member_id, amount: s.amount })),
    }))
  );
  const settlements = settle(balances);

  // My net for this group (positive = owed to me)
  const myNet = myMember ? balances.get(myMember.id) ?? 0 : 0;

  return (
    <>
      <PageHeader
        title={`${group.emoji ?? "👥"} ${group.name}`}
        subtitle={`${group.members.length} anggota`}
        back
        right={
          <Link href={`/groups/${group.id}/settings`} aria-label="Pengaturan">
            <Button size="icon" variant="ghost">
              <Settings2 className="size-5" />
            </Button>
          </Link>
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
                {myNet === 0
                  ? "Kamu lunas dengan grup ini ✨"
                  : myNet > 0 ? (
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

        {/* Members strip */}
        <section>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Anggota · {group.members.length}
          </h3>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 no-scrollbar">
            {group.members.map((m) => (
              <div key={m.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                <Avatar
                  name={m.display_name}
                  size="lg"
                  className="ring-2 ring-[var(--color-card)] shadow-[var(--shadow-card)]"
                />
                <p className="w-full truncate text-center text-[11px] font-medium">
                  {m.id === myMember?.id ? "Kamu" : m.display_name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Settlements */}
        {settlements.length > 0 && (
          <section className="float-in" style={{ animationDelay: "60ms" }}>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Saran pembayaran
            </h3>
            <Card className="divide-y divide-[var(--color-border)]">
              {settlements.map((s, i) => {
                const from = memberMap.get(s.fromMemberId);
                const to = memberMap.get(s.toMemberId);
                if (!from || !to) return null;
                return (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <Avatar name={from.display_name} size="sm" />
                    <ArrowRight className="size-4 text-[var(--color-muted-foreground)]" />
                    <Avatar name={to.display_name} size="sm" />
                    <p className="flex-1 text-sm leading-tight">
                      <span className="font-semibold">
                        {from.id === myMember?.id ? "Kamu" : from.display_name}
                      </span>{" "}
                      <span className="text-[var(--color-muted-foreground)]">→</span>{" "}
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

        {settlements.length === 0 && total > 0 && (
          <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-[color-mix(in_oklab,var(--color-success),transparent_88%)] px-4 py-3 text-xs text-[var(--color-success)]">
            <ArrowLeftRight className="size-3.5" />
            Semua sudah lunas
          </p>
        )}

        {/* Expenses */}
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
            <ul className="space-y-2">
              {group.expenses.map((e, i) => {
                const payer = memberMap.get(e.paid_by_member_id);
                const myShare =
                  e.splits.find((s) => s.member_id === myMember?.id)?.amount ?? 0;
                const involved = e.splits.length;
                return (
                  <li
                    key={e.id}
                    className="float-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <Link href={`/groups/${group.id}/expenses/${e.id}`}>
                      <Card className="flex items-center gap-3 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)]">
                        <Avatar name={payer?.display_name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold leading-tight tracking-tight">
                            {e.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                            {payer?.id === myMember?.id ? "Kamu" : payer?.display_name}{" "}
                            bayar ·{" "}
                            {format(new Date(e.spent_at), "d MMM", {
                              locale: idLocale,
                            })}{" "}
                            · {involved} orang
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tabular text-sm font-semibold">
                            {formatRupiah(e.amount)}
                          </p>
                          {myMember && myShare > 0 && (
                            <Badge
                              variant={
                                payer?.id === myMember.id ? "success" : "secondary"
                              }
                              className="mt-1 tabular"
                            >
                              {payer?.id === myMember.id
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
          )}
        </section>
      </div>
    </>
  );
}
