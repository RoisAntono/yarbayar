import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ArrowLeftRight,
  ArrowRight,
  Plus,
  Receipt,
  UserPlus,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { computeBalances, settle } from "@/lib/balances";
import { getCurrentUser, getGroupDetail } from "@/lib/data";
import { cn, formatRupiah } from "@/lib/utils";

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

  return (
    <>
      <PageHeader
        title={`${group.emoji ?? "👥"} ${group.name}`}
        subtitle={`${group.members.length} anggota · Total ${formatRupiah(total)}`}
        back
        right={
          <Link href={`/groups/${group.id}/settings`} aria-label="Pengaturan">
            <Button size="icon" variant="ghost">
              <UserPlus className="size-5" />
            </Button>
          </Link>
        }
      />

      <div className="px-4 py-4 space-y-5">
        {/* Members */}
        <section>
          <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] mb-2">
            Anggota
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
            {group.members.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
                <Avatar name={m.display_name} size="lg" />
                <p className="text-xs text-center truncate w-full font-medium">
                  {m.id === myMember?.id ? "Kamu" : m.display_name}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Settlements */}
        {settlements.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)] mb-2">
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
                      <span className="font-medium">
                        {from.id === myMember?.id ? "Kamu" : from.display_name}
                      </span>{" "}
                      bayar ke{" "}
                      <span className="font-medium">
                        {to.id === myMember?.id ? "kamu" : to.display_name}
                      </span>
                    </p>
                    <span className="font-semibold text-sm">
                      {formatRupiah(s.amount)}
                    </span>
                  </div>
                );
              })}
            </Card>
          </section>
        )}

        {/* Expenses */}
        <section>
          <header className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-[var(--color-muted-foreground)]">
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
                description="Catat pengeluaran pertama kalian, atau scan nota langsung dari kamera."
                action={
                  <Link href={`/groups/${group.id}/expenses/new`}>
                    <Button size="sm" className="mt-2">
                      <Plus className="size-4" /> Tambah pengeluaran
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <ul className="space-y-2">
              {group.expenses.map((e) => {
                const payer = memberMap.get(e.paid_by_member_id);
                const myShare = e.splits.find((s) => s.member_id === myMember?.id)?.amount ?? 0;
                const involved = e.splits.length;
                return (
                  <li key={e.id}>
                    <Link href={`/groups/${group.id}/expenses/${e.id}`}>
                      <Card className="p-3.5 flex items-center gap-3 hover:bg-[var(--color-muted)] transition-colors">
                        <Avatar name={payer?.display_name} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate leading-tight">{e.title}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                            {payer?.id === myMember?.id ? "Kamu" : payer?.display_name} bayar ·{" "}
                            {format(new Date(e.spent_at), "d MMM", { locale: idLocale })} · {involved} orang
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">{formatRupiah(e.amount)}</p>
                          {myMember && myShare > 0 && (
                            <Badge
                              variant={
                                payer?.id === myMember.id
                                  ? "success"
                                  : "secondary"
                              }
                              className="mt-1"
                            >
                              {payer?.id === myMember.id
                                ? `+${formatRupiah(e.amount - myShare)}`
                                : `-${formatRupiah(myShare)}`}
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

      {/* FAB */}
      <Link
        href={`/groups/${group.id}/expenses/new`}
        className={cn(
          "fixed bottom-24 right-4 z-20 size-14 rounded-full grid place-items-center",
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-pop)]",
          "active:scale-95 transition-transform"
        )}
        aria-label="Tambah pengeluaran"
      >
        <Plus className="size-6" />
      </Link>

      {/* Spacer to prevent content under FAB+nav */}
      <div className="h-4" />
      {settlements.length === 0 && total > 0 && (
        <p className="text-center text-xs text-[var(--color-muted-foreground)] flex items-center justify-center gap-1">
          <ArrowLeftRight className="size-3.5" /> Semua sudah lunas
        </p>
      )}
    </>
  );
}
