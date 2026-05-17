"use client";

import { useActionState, useMemo, useState } from "react";
import { Camera, Check, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptScanner } from "@/components/scan/receipt-scanner";
import { computeSplits } from "@/lib/balances";
import { createClient } from "@/lib/supabase/client";
import { cn, formatRupiah, parseRupiahInput } from "@/lib/utils";
import type { SplitMethod } from "@/types/database";
import {
  createExpenseAction,
  editExpenseAction,
  type ExpenseFormState,
} from "../actions";

interface Member {
  id: string;
  display_name: string;
  profile_id: string | null;
}

/**
 * Initial values when editing an existing expense. When omitted the form
 * defaults to a blank "create" state.
 */
export interface ExpenseInitial {
  id: string;
  title: string;
  amount: number;
  paid_by_member_id: string;
  split_method: SplitMethod;
  spent_at: string;
  notes: string | null;
  receipt_url: string | null;
  category: string | null;
  splits: { member_id: string; amount: number }[];
}

interface ExpenseFormProps {
  groupId: string;
  members: Member[];
  defaultPaidBy: string;
  /**
   * If provided, the form switches to edit mode: prefills fields and
   * submits to editExpenseAction instead of createExpenseAction.
   */
  initial?: ExpenseInitial;
}

const METHOD_OPTIONS: { value: SplitMethod; label: string }[] = [
  { value: "equal", label: "Sama rata" },
  { value: "exact", label: "Manual" },
  { value: "percent", label: "Persen" },
  { value: "shares", label: "Bagian" },
];

/**
 * Reverse-engineer the per-member input "value" from saved splits.
 * For `equal` / `exact` we can derive these directly, but `percent` /
 * `shares` aren't recoverable losslessly — we fall back to "exact"
 * editing in those cases (still lets the user fix things), preserving
 * each member's saved amount.
 */
function recoverValuesForEdit(initial: ExpenseInitial, members: Member[]) {
  const splitMap = new Map(initial.splits.map((s) => [s.member_id, s.amount]));
  if (initial.split_method === "equal") {
    return Object.fromEntries(
      members.map((m) => [m.id, splitMap.has(m.id) ? 1 : 0])
    ) as Record<string, number>;
  }
  // exact / percent / shares — store amounts and switch method to "exact"
  return Object.fromEntries(
    members.map((m) => [m.id, splitMap.get(m.id) ?? 0])
  ) as Record<string, number>;
}

export function ExpenseForm({
  groupId,
  members,
  defaultPaidBy,
  initial,
}: ExpenseFormProps) {
  const isEdit = !!initial;
  const action = isEdit ? editExpenseAction : createExpenseAction;
  const [state, formAction, pending] = useActionState<ExpenseFormState, FormData>(
    action,
    undefined
  );

  const [title, setTitle] = useState(initial?.title ?? "");
  const [amountStr, setAmountStr] = useState(
    initial ? String(initial.amount) : ""
  );
  // Empty by default on create — forces the user to consciously pick the
  // payer instead of accidentally saving with whoever was at the top of
  // the list. On edit we keep the saved value.
  const [paidBy, setPaidBy] = useState(initial?.paid_by_member_id ?? "");
  // For non-equal saved methods we degrade to exact editing — see helper.
  const [method, setMethod] = useState<SplitMethod>(
    initial && initial.split_method !== "equal" ? "exact" : initial?.split_method ?? "equal"
  );
  // Same idea for splits: nothing pre-checked on create. Users almost
  // always need to think about who's included (skipping the picky eater,
  // for example), and a screen pre-filled with everyone selected
  // encourages "save and forget". Edit mode still recovers from saved
  // splits so existing expenses don't lose their state.
  const [values, setValues] = useState<Record<string, number>>(() =>
    initial
      ? recoverValuesForEdit(initial, members)
      : Object.fromEntries(members.map((m) => [m.id, 0]))
  );
  const [receiptUrl, setReceiptUrl] = useState<string | null>(
    initial?.receipt_url ?? null
  );
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [spentAt, setSpentAt] = useState(
    initial?.spent_at?.slice(0, 10) ?? today
  );

  const amount = parseRupiahInput(amountStr);

  const splits = useMemo(() => {
    return computeSplits(
      method,
      amount,
      members.map((m) => ({ memberId: m.id, value: values[m.id] ?? 0 }))
    );
  }, [method, amount, members, values]);

  const totalSplit = splits.reduce((s, x) => s + x.amount, 0);
  const remainder = amount - totalSplit;

  function setMemberValue(id: string, val: number) {
    setValues((v) => ({ ...v, [id]: val }));
  }

  async function onScanResult(
    result: { amount: number | null; merchant: string | null; text: string },
    file: File
  ) {
    if (result.amount) {
      setAmountStr(String(result.amount));
      toast.success(`Total terdeteksi: ${formatRupiah(result.amount)}`);
    } else {
      toast.message("Total tidak terdeteksi", {
        description: "Foto disimpan, isi nominal manual ya.",
      });
    }
    if (result.merchant && !title) setTitle(result.merchant);

    // Upload to Supabase Storage
    try {
      setUploadingReceipt(true);
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authed");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${u.user.id}/${groupId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("receipts")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      setReceiptUrl(path);
    } catch (err) {
      console.warn("Receipt upload failed", err);
      toast.error("Gagal upload nota, tapi nominal tetap tersimpan");
    } finally {
      setUploadingReceipt(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="split_method" value={method} />
      {receiptUrl && <input type="hidden" name="receipt_url" value={receiptUrl} />}
      {initial && <input type="hidden" name="expense_id" value={initial.id} />}

      {/* Amount hero with aurora */}
      <Card className="aurora grain relative overflow-hidden border-0 p-6 text-center text-[var(--color-on-ink)]">
        <div className="relative z-[2]">
          <Label className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-70">
            Nominal
          </Label>
          <div className="mt-2 flex items-baseline justify-center gap-1.5">
            <span className="font-display text-2xl opacity-60">Rp</span>
            <input
              inputMode="numeric"
              name="amount"
              value={
                amount > 0 ? new Intl.NumberFormat("id-ID").format(amount) : ""
              }
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0"
              className="font-display tabular w-full max-w-[260px] bg-transparent text-center text-5xl tracking-tight outline-none placeholder:opacity-30"
            />
          </div>
          {state?.fieldErrors?.amount && (
            <p className="mt-2 text-xs text-[var(--color-warning)]">
              {state.fieldErrors.amount}
            </p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="accent"
              onClick={() => setScannerOpen(true)}
              loading={uploadingReceipt}
            >
              <Camera className="size-4" />
              {receiptUrl ? "Ganti foto nota" : "Scan nota"}
            </Button>
            {receiptUrl && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">
                <Receipt className="size-3.5" /> Nota tersimpan
              </span>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-1.5">
        <Label htmlFor="title">Judul</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mis. Makan siang, Bensin, Tiket"
          required
          aria-invalid={!!state?.fieldErrors?.title}
        />
        {state?.fieldErrors?.title && (
          <p className="text-xs text-[var(--color-destructive)]">
            {state.fieldErrors.title}
          </p>
        )}
      </div>


      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="spent_at">Tanggal</Label>
          <Input
            id="spent_at"
            name="spent_at"
            type="date"
            value={spentAt}
            onChange={(e) => setSpentAt(e.target.value)}
            max={today}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paid_by_member_id">Dibayar oleh</Label>
          <select
            id="paid_by_member_id"
            name="paid_by_member_id"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            required
            aria-invalid={!!state?.fieldErrors?.paid_by}
            className={cn(
              "h-12 w-full rounded-xl border bg-[var(--color-input)] px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
              paidBy
                ? "border-[var(--color-border)] text-[var(--color-foreground)]"
                : "border-[var(--color-border)] text-[var(--color-muted-foreground)]"
            )}
          >
            <option value="" disabled>
              Pilih anggota…
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id} className="text-[var(--color-foreground)]">
                {m.display_name}
              </option>
            ))}
          </select>
          {state?.fieldErrors?.paid_by && (
            <p className="text-xs text-[var(--color-destructive)]">
              {state.fieldErrors.paid_by}
            </p>
          )}
        </div>
      </div>

      {/* Split method */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cara membagi</Label>
          {amount > 0 && (
            <span
              className={cn(
                "tabular rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                totalSplit === 0
                  ? "bg-[color-mix(in_oklab,var(--color-warning),transparent_85%)] text-[oklch(0.45_0.16_75)]"
                  : remainder === 0
                    ? "bg-[color-mix(in_oklab,var(--color-success),transparent_88%)] text-[var(--color-success)]"
                    : "bg-[color-mix(in_oklab,var(--color-warning),transparent_85%)] text-[oklch(0.45_0.16_75)]"
              )}
            >
              {totalSplit === 0
                ? "Pilih anggota dulu"
                : remainder === 0
                  ? "Pas ✓"
                  : remainder > 0
                    ? `Sisa ${formatRupiah(remainder)}`
                    : `Lebih ${formatRupiah(-remainder)}`}
            </span>
          )}
        </div>
        <Segmented
          options={METHOD_OPTIONS}
          value={method}
          onChange={(v) => setMethod(v)}
          className="w-full justify-between [&_button]:flex-1"
        />
        {amount > 0 && totalSplit === 0 && (
          <p className="rounded-xl bg-[color-mix(in_oklab,var(--color-warning),transparent_90%)] px-3 py-2 text-[11px] text-[oklch(0.45_0.16_75)]">
            Centang anggota yang ikut patungan di bawah, atau isi nominal/persen/bagian
            sesuai metode yang kamu pilih.
          </p>
        )}
      </div>

      {/* Per-member splits */}
      <ul className="space-y-2">
        {members.map((m) => {
          const split = splits.find((s) => s.memberId === m.id)?.amount ?? 0;
          const value = values[m.id] ?? 0;
          const included = value > 0;
          return (
            <li
              key={m.id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                included
                  ? "border-[var(--color-border)] bg-[var(--color-card)]"
                  : "border-dashed border-[var(--color-border)] bg-transparent opacity-60"
              )}
            >
              <input type="hidden" name="member_id" value={m.id} />
              <input type="hidden" name="member_value" value={value} />
              <Avatar name={m.display_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.display_name}</p>
                <p className="tabular text-xs text-[var(--color-muted-foreground)]">
                  {formatRupiah(split)}
                </p>
              </div>
              {method === "equal" && (
                <button
                  type="button"
                  onClick={() => setMemberValue(m.id, included ? 0 : 1)}
                  className={cn(
                    "grid size-8 place-items-center rounded-xl border-2 transition-all active:scale-95",
                    included
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "border-[var(--color-border)]"
                  )}
                  aria-label={included ? "Sertakan" : "Lewati"}
                >
                  {included && <Check className="size-4" strokeWidth={3} />}
                </button>
              )}
              {method === "exact" && (
                <input
                  inputMode="numeric"
                  value={value || ""}
                  onChange={(e) =>
                    setMemberValue(m.id, parseRupiahInput(e.target.value))
                  }
                  placeholder="0"
                  className="tabular h-10 w-28 rounded-xl bg-[var(--color-muted)] px-3 text-right text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                />
              )}
              {method === "percent" && (
                <div className="flex items-center gap-1">
                  <input
                    inputMode="decimal"
                    value={value || ""}
                    onChange={(e) =>
                      setMemberValue(m.id, Number(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="tabular h-10 w-16 rounded-xl bg-[var(--color-muted)] px-3 text-right text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  />
                  <span className="text-sm text-[var(--color-muted-foreground)]">%</span>
                </div>
              )}
              {method === "shares" && (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMemberValue(m.id, Math.max(0, value - 1))}
                    className="grid size-9 place-items-center rounded-xl bg-[var(--color-muted)] font-bold text-lg leading-none active:scale-95"
                  >
                    −
                  </button>
                  <span className="tabular w-7 text-center text-sm font-semibold">
                    {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMemberValue(m.id, value + 1)}
                    className="grid size-9 place-items-center rounded-xl bg-[var(--color-muted)] font-bold text-lg leading-none active:scale-95"
                  >
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {state?.fieldErrors?.splits && (
        <p className="rounded-2xl bg-[color-mix(in_oklab,var(--color-destructive),transparent_88%)] px-4 py-3 text-sm text-[var(--color-destructive)]">
          {state.fieldErrors.splits}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">Catatan (opsional)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Tambahkan catatan…"
          rows={2}
          defaultValue={initial?.notes ?? ""}
        />
      </div>

      {state?.error && (
        <p className="rounded-2xl bg-[color-mix(in_oklab,var(--color-destructive),transparent_88%)] px-4 py-3 text-sm text-[var(--color-destructive)]">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        size="lg"
        className="w-full"
        disabled={amount <= 0 || remainder !== 0 || !paidBy || totalSplit === 0}
      >
        {isEdit ? "Simpan perubahan" : "Simpan pengeluaran"}
      </Button>

      <ReceiptScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onResult={onScanResult}
      />
    </form>
  );
}
