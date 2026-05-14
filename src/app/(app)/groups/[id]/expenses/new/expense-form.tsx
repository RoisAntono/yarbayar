"use client";

import { useActionState, useMemo, useState } from "react";
import { Camera, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";
import { ReceiptScanner } from "@/components/scan/receipt-scanner";
import { computeSplits } from "@/lib/balances";
import { createClient } from "@/lib/supabase/client";
import { cn, formatRupiah, parseRupiahInput } from "@/lib/utils";
import type { SplitMethod } from "@/types/database";
import { createExpenseAction, type ExpenseFormState } from "../actions";

interface Member {
  id: string;
  display_name: string;
  profile_id: string | null;
}

interface ExpenseFormProps {
  groupId: string;
  members: Member[];
  defaultPaidBy: string;
}

const METHOD_OPTIONS: { value: SplitMethod; label: string }[] = [
  { value: "equal", label: "Sama rata" },
  { value: "exact", label: "Manual" },
  { value: "percent", label: "Persen" },
  { value: "shares", label: "Bagian" },
];

export function ExpenseForm({ groupId, members, defaultPaidBy }: ExpenseFormProps) {
  const [state, formAction, pending] = useActionState<ExpenseFormState, FormData>(
    createExpenseAction,
    undefined
  );
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [paidBy, setPaidBy] = useState(defaultPaidBy);
  const [method, setMethod] = useState<SplitMethod>("equal");
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(members.map((m) => [m.id, 1]))
  );
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [spentAt, setSpentAt] = useState(today);

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

      {/* Big amount input */}
      <div className="space-y-2 text-center pt-2">
        <Label className="text-xs text-[var(--color-muted-foreground)]">
          Nominal
        </Label>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl font-medium text-[var(--color-muted-foreground)]">
            Rp
          </span>
          <input
            inputMode="numeric"
            name="amount"
            value={amount > 0 ? new Intl.NumberFormat("id-ID").format(amount) : ""}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0"
            className="bg-transparent text-4xl font-bold tracking-tight outline-none w-full max-w-[260px] text-center placeholder:text-[var(--color-muted-foreground)]/40"
          />
        </div>
        {state?.fieldErrors?.amount && (
          <p className="text-xs text-[var(--color-destructive)]">
            {state.fieldErrors.amount}
          </p>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setScannerOpen(true)}
          loading={uploadingReceipt}
        >
          <Camera className="size-4" />
          {receiptUrl ? "Ganti foto nota" : "Scan nota"}
        </Button>
        {receiptUrl && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-center">
            <Receipt className="size-3.5" /> Nota tersimpan
          </p>
        )}
      </div>

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
            className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-input)] px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Split method */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cara membagi</Label>
          <span
            className={cn(
              "text-xs font-medium",
              remainder === 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-[var(--color-warning)]"
            )}
          >
            {remainder === 0
              ? "Pas ✓"
              : remainder > 0
                ? `Sisa ${formatRupiah(remainder)}`
                : `Lebih ${formatRupiah(-remainder)}`}
          </span>
        </div>
        <Segmented
          options={METHOD_OPTIONS}
          value={method}
          onChange={(v) => setMethod(v)}
          className="w-full justify-between [&_button]:flex-1"
        />
      </div>

      {/* Per-member splits */}
      <ul className="space-y-2">
        {members.map((m) => {
          const split = splits.find((s) => s.memberId === m.id)?.amount ?? 0;
          const value = values[m.id] ?? 0;
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3"
            >
              <input type="hidden" name="member_id" value={m.id} />
              <input type="hidden" name="member_value" value={value} />
              <Avatar name={m.display_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{m.display_name}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  {formatRupiah(split)}
                </p>
              </div>
              {method === "equal" && (
                <button
                  type="button"
                  onClick={() => setMemberValue(m.id, value > 0 ? 0 : 1)}
                  className={cn(
                    "size-7 rounded-md border-2 grid place-items-center transition-colors",
                    value > 0
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                      : "border-[var(--color-border)]"
                  )}
                  aria-label={value > 0 ? "Sertakan" : "Lewati"}
                >
                  {value > 0 ? "✓" : ""}
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
                  className="w-28 h-9 rounded-lg bg-[var(--color-muted)] px-2 text-right text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
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
                    className="w-16 h-9 rounded-lg bg-[var(--color-muted)] px-2 text-right text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  />
                  <span className="text-sm text-[var(--color-muted-foreground)]">%</span>
                </div>
              )}
              {method === "shares" && (
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMemberValue(m.id, Math.max(0, value - 1))}
                    className="size-8 rounded-md bg-[var(--color-muted)] font-bold"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium">{value}</span>
                  <button
                    type="button"
                    onClick={() => setMemberValue(m.id, value + 1)}
                    className="size-8 rounded-md bg-[var(--color-muted)] font-bold"
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
        <p className="text-sm text-[var(--color-destructive)] bg-[var(--color-destructive)]/10 px-3 py-2 rounded-lg">
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
        />
      </div>

      {state?.error && (
        <p className="text-sm text-[var(--color-destructive)] bg-[var(--color-destructive)]/10 px-3 py-2 rounded-lg">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        loading={pending}
        size="lg"
        className="w-full"
        disabled={amount <= 0 || remainder !== 0}
      >
        Simpan pengeluaran
      </Button>

      <ReceiptScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onResult={onScanResult}
      />
    </form>
  );
}
