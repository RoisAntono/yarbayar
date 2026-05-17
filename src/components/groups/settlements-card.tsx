"use client";

import { useRef, useTransition } from "react";
import { ArrowRight, Check, Clock, CornerDownLeft, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn, formatRupiah } from "@/lib/utils";

/**
 * Wrapper untuk server action call yang memberikan toast feedback.
 * Settlement actions = primary social flow — wajib visual confirmation
 * (Gen-Z principle: "Haptic-like feedback wajib setelah action sukses").
 *
 * Server actions di sini ngga return error state (tipe `Promise<void>`),
 * jadi kita handle via try/catch. Kalau action throw → toast error;
 * kalau resolve → toast success dengan label yang sesuai konteks.
 */
async function withToast<T>(
  promise: Promise<T>,
  successMsg: string,
  errorMsg = "Gagal memproses, coba lagi"
): Promise<void> {
  try {
    await promise;
    toast.success(successMsg);
  } catch (err) {
    console.warn("Settlement action failed", err);
    toast.error(errorMsg);
  }
}


interface MemberLite {
  id: string;
  display_name: string;
  profile_id: string | null;
}

interface SuggestedRow {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

interface SettlementRow {
  id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  paid_at: string;
  confirmed_at: string | null;
  note: string | null;
}

interface SettlementsCardProps {
  groupId: string;
  myMemberId: string | null;
  /** True when the current user is the group owner — owner can proxy for guests. */
  isOwner: boolean;
  members: MemberLite[];
  /** Open suggestions from balance solver (after applying confirmed settlements) */
  suggestions: SuggestedRow[];
  /** Pending payments — debtor said paid, creditor not confirmed yet */
  pending: SettlementRow[];
  /** Confirmed payment history */
  confirmed: SettlementRow[];
  markPaidAction: (formData: FormData) => Promise<void>;
  confirmAction: (formData: FormData) => Promise<void>;
  unmarkPaidAction: (formData: FormData) => Promise<void>;
}

/** A member without an account (i.e. guest) — checked via profile_id. */
function isGuest(m: MemberLite | undefined): boolean {
  return !!m && m.profile_id === null;
}

/**
 * Three-section card:
 *   1. "Saran pembayaran" — what's still owed; the debtor sees a "Sudah
 *      bayar" button, the creditor sees a passive view.
 *   2. "Menunggu konfirmasi" — debtor has marked paid; creditor sees a
 *      "Konfirmasi" button, debtor can withdraw.
 *   3. "Sudah lunas" — confirmed history, collapsed by default.
 *
 * All actions go through Server Actions wrapped in <form action={…}> so
 * we keep RLS-correct mutations and avoid client supabase calls.
 */
export function SettlementsCard({
  groupId,
  myMemberId,
  isOwner,
  members,
  suggestions,
  pending,
  confirmed,
  markPaidAction,
  confirmAction,
  unmarkPaidAction,
}: SettlementsCardProps) {
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const name = (id: string) => {
    const m = memberMap.get(id);
    if (!m) return "—";
    return m.id === myMemberId ? "Kamu" : m.display_name;
  };

  const allDone = suggestions.length === 0 && pending.length === 0;

  return (
    <div className="space-y-4">
      {/* Suggested (still outstanding) */}
      {suggestions.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Saran pembayaran
          </h3>
          <Card className="divide-y divide-[var(--color-border)]">
            {suggestions.map((s, i) => {
              const debtor = memberMap.get(s.fromMemberId);
              const creditor = memberMap.get(s.toMemberId);
              const isDebtor = myMemberId === s.fromMemberId;
              const isCreditor = myMemberId === s.toMemberId;
              // Owner can mark-paid on behalf of a guest debtor
              const canActAsOwner = isOwner && isGuest(debtor);
              return (
                <div
                  key={`${s.fromMemberId}-${s.toMemberId}-${i}`}
                  className="flex flex-col gap-2 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={memberMap.get(s.fromMemberId)?.display_name}
                      size="sm"
                    />
                    <ArrowRight className="size-4 text-[var(--color-muted-foreground)]" />
                    <Avatar
                      name={memberMap.get(s.toMemberId)?.display_name}
                      size="sm"
                    />
                    <p className="flex-1 text-sm leading-tight">
                      <span className="font-semibold">{name(s.fromMemberId)}</span>{" "}
                      <span className="text-[var(--color-muted-foreground)]">
                        bayar ke
                      </span>{" "}
                      <span className="font-semibold">{name(s.toMemberId)}</span>
                    </p>
                    <span className="tabular text-sm font-semibold">
                      {formatRupiah(s.amount)}
                    </span>
                  </div>
                  {isDebtor && (
                    <MarkPaidForm
                      action={markPaidAction}
                      groupId={groupId}
                      fromId={s.fromMemberId}
                      toId={s.toMemberId}
                      amount={s.amount}
                      toName={name(s.toMemberId)}
                    />
                  )}
                  {!isDebtor && canActAsOwner && (
                    <MarkPaidForm
                      action={markPaidAction}
                      groupId={groupId}
                      fromId={s.fromMemberId}
                      toId={s.toMemberId}
                      amount={s.amount}
                      toName={name(s.toMemberId)}
                      proxyLabel={`Tandai ${debtor?.display_name} sudah bayar`}
                    />
                  )}
                  {isCreditor && !canActAsOwner && (
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Tunggu {name(s.fromMemberId)} menandai sudah bayar.
                    </p>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Pending — needs creditor confirmation */}
      {pending.length > 0 && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-warning)]">
            <Clock className="size-3.5" /> Menunggu konfirmasi · {pending.length}
          </h3>
          <Card className="divide-y divide-[var(--color-border)]">
            {pending.map((s) => {
              const debtor = memberMap.get(s.from_member_id);
              const creditor = memberMap.get(s.to_member_id);
              const isCreditor = myMemberId === s.to_member_id;
              const isDebtor = myMemberId === s.from_member_id;
              // Owner can confirm on behalf of a guest creditor, or
              // withdraw on behalf of a guest debtor.
              const ownerCanConfirm = isOwner && isGuest(creditor) && !isCreditor;
              const ownerCanWithdraw = isOwner && isGuest(debtor) && !isDebtor;
              return (
                <div key={s.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={memberMap.get(s.from_member_id)?.display_name}
                      size="sm"
                    />
                    <CornerDownLeft className="size-4 rotate-180 text-[var(--color-muted-foreground)]" />
                    <Avatar
                      name={memberMap.get(s.to_member_id)?.display_name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-tight">
                        <span className="font-semibold">{name(s.from_member_id)}</span>{" "}
                        <span className="text-[var(--color-muted-foreground)]">
                          bilang sudah bayar
                        </span>{" "}
                        <span className="font-semibold">{name(s.to_member_id)}</span>
                      </p>
                      {s.note && (
                        <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
                          “{s.note}”
                        </p>
                      )}
                    </div>
                    <span className="tabular text-sm font-semibold">
                      {formatRupiah(s.amount)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {(isCreditor || ownerCanConfirm) && (
                      <ServerActionButton
                        action={confirmAction}
                        formFields={{
                          settlement_id: s.id,
                          group_id: groupId,
                        }}
                        variant="accent"
                        size="sm"
                        className="flex-1 gap-1.5"
                        successToast={
                          ownerCanConfirm
                            ? `Pelunasan ${debtor?.display_name} dikonfirmasi`
                            : `Pelunasan dari ${name(s.from_member_id)} dikonfirmasi ✓`
                        }
                        label={
                          <>
                            <Check className="size-4" />
                            {ownerCanConfirm
                              ? `Konfirmasi utk ${creditor?.display_name}`
                              : "Konfirmasi"}
                          </>
                        }
                      />
                    )}
                    {(isDebtor || ownerCanWithdraw) && (
                      <ConfirmWithdraw
                        action={unmarkPaidAction}
                        settlementId={s.id}
                        groupId={groupId}
                        toName={name(s.to_member_id)}
                      />
                    )}
                    {!isCreditor && !isDebtor && !ownerCanConfirm && !ownerCanWithdraw && (
                      <p className="text-[11px] text-[var(--color-muted-foreground)]">
                        Menunggu {name(s.to_member_id)} mengonfirmasi.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* All clear */}
      {allDone && (
        <p className="flex items-center justify-center gap-1.5 rounded-2xl bg-[color-mix(in_oklab,var(--color-success),transparent_88%)] px-4 py-3 text-xs text-[var(--color-success)]">
          <Check className="size-3.5" /> Semua tagihan sudah lunas
        </p>
      )}

      {/* Confirmed history (collapsed-style) */}
      {confirmed.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            <span>Riwayat pelunasan · {confirmed.length}</span>
            <span className="text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <Card className="mt-2 divide-y divide-[var(--color-border)]">
            {confirmed.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <Avatar name={memberMap.get(s.from_member_id)?.display_name} size="sm" />
                <ArrowRight className="size-3.5 text-[var(--color-muted-foreground)]" />
                <Avatar name={memberMap.get(s.to_member_id)?.display_name} size="sm" />
                <p className="min-w-0 flex-1 truncate text-xs text-[var(--color-muted-foreground)]">
                  {name(s.from_member_id)} → {name(s.to_member_id)}
                </p>
                <span className="tabular text-xs font-semibold">
                  {formatRupiah(s.amount)}
                </span>
              </div>
            ))}
          </Card>
        </details>
      )}
    </div>
  );
}

/**
 * Mark-paid expands to a small inline form so the debtor can attach a
 * note (optional) — feels less abrupt than a single button-tap that
 * silently records a payment. Kept as a <details> for zero-JS fallback.
 */
function MarkPaidForm({
  action,
  groupId,
  fromId,
  toId,
  amount,
  toName,
  proxyLabel,
}: {
  action: (fd: FormData) => Promise<void>;
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
  toName: string;
  /** When set, the form is submitted by an owner on a guest's behalf. */
  proxyLabel?: string;
}) {
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <details>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-pop-accent)] active:scale-95">
        <Check className="size-3.5" /> {proxyLabel ?? "Sudah bayar"}
      </summary>
      <form
        ref={formRef}
        action={(fd) =>
          start(() =>
            withToast(
              action(fd),
              proxyLabel
                ? `Ditandai sudah bayar ke ${toName}`
                : `Pembayaran ke ${toName} dicatat`
            )
          )
        }
        className="mt-2 flex gap-2"
      >
        <input type="hidden" name="group_id" value={groupId} />
        <input type="hidden" name="from_member_id" value={fromId} />
        <input type="hidden" name="to_member_id" value={toId} />
        <input type="hidden" name="amount" value={amount} />
        <input
          type="text"
          name="note"
          placeholder={`Catatan utk ${toName} (opsional)`}
          className="h-9 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          maxLength={120}
        />
        <Button type="submit" size="sm" loading={pending}>
          Kirim
        </Button>
      </form>
    </details>
  );
}

function ServerActionButton({
  action,
  formFields,
  label,
  variant,
  size,
  className,
  successToast,
}: {
  action: (fd: FormData) => Promise<void>;
  formFields: Record<string, string>;
  label: React.ReactNode;
  variant?: "accent" | "outline" | "destructive" | "default" | "secondary" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  /**
   * Toast message saat action sukses. Optional — kalau callsite ngga
   * butuh feedback (mis. mutation visual sudah jelas), boleh skip.
   */
  successToast?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) =>
        start(() =>
          successToast
            ? withToast(action(fd), successToast)
            : action(fd)
        )
      }
      className={cn("inline-flex", className && "flex-1")}
    >
      {Object.entries(formFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button
        type="submit"
        loading={pending}
        variant={variant}
        size={size}
        className={className}
      >
        {label}
      </Button>
    </form>
  );
}

function ConfirmWithdraw({
  action,
  settlementId,
  groupId,
  toName,
}: {
  action: (fd: FormData) => Promise<void>;
  settlementId: string;
  groupId: string;
  toName: string;
}) {
  // Pakai ref + onSubmit interception supaya bisa wrap dengan toast
  // tanpa double-action (kalau pakai form action={...}, form submit
  // langsung trigger sebelum kita catch error).
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <>
      <form
        ref={formRef}
        action={(fd) =>
          withToast(
            action(fd),
            "Tanda pembayaran dibatalkan, tagihan kembali terbuka"
          )
        }
        className="hidden"
      >
        <input type="hidden" name="settlement_id" value={settlementId} />
        <input type="hidden" name="group_id" value={groupId} />
      </form>
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="sm" className="flex-1 gap-1.5">
            <X className="size-4" /> Batalkan
          </Button>
        }
        title="Batalkan tanda 'sudah bayar'?"
        description={
          <>
            Catatan pembayaran ke <span className="font-semibold">{toName}</span> akan
            dihapus. Tagihan kembali jadi terbuka.
          </>
        }
        confirmLabel="Batalkan"
        variant="destructive"
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}
