"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, parseRupiahInput } from "@/lib/utils";
import { updateSavingsTargetAction } from "../actions";

interface GoalFormProps {
  /** Current saved target. Null = belum set. */
  initialTarget: number | null;
  /** Currency code dari profile.currency, dipakai untuk preview. */
  currency: string;
}

/**
 * Form set target nabung bulanan.
 *
 * Single field: input nominal. Tap "Simpan" → submit value, tap
 * "Hapus target" → submit value=0 untuk reset ke null.
 *
 * Live preview di bawah field menampilkan formatted version saat user
 * ngetik — analog dengan currency picker yang preview "Rp 100.000"
 * di setiap row. Mengurangi friction "wait, nominal saya bener gak?"
 * tanpa perlu submit dulu.
 *
 * Form action di-call langsung dari `<form action={...}>` — tidak
 * butuh useActionState karena flow-nya simple: server action redirect
 * balik ke /profile setelah sukses.
 */
export function GoalForm({ initialTarget, currency }: GoalFormProps) {
  // Local state untuk input + preview. parseRupiahInput strip non-digit
  // jadi user bisa ngetik "500.000" atau "500000" tanpa perlu mikir.
  const [amountStr, setAmountStr] = useState(
    initialTarget ? String(initialTarget) : ""
  );
  const parsed = parseRupiahInput(amountStr);

  return (
    <div className="space-y-4">
      <form action={updateSavingsTargetAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Target nabung tiap bulan</Label>
          <div className="relative">
            <Input
              id="amount"
              name="amount"
              inputMode="numeric"
              placeholder="Mis. 500.000"
              value={
                parsed > 0
                  ? new Intl.NumberFormat("id-ID").format(parsed)
                  : ""
              }
              onChange={(e) => setAmountStr(e.target.value)}
              className="h-14 pl-12 text-lg font-semibold tabular tracking-tight"
              aria-describedby="amount-preview"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--color-muted-foreground)]">
              <Target className="size-4" />
            </span>
          </div>
          {/* Live preview — give user instant "ini bener atau bukan"
              feedback. Empty kalau 0/empty input supaya tidak
              menampilkan "Rp 0" yang ambigu. */}
          {parsed > 0 ? (
            <p
              id="amount-preview"
              className="px-1 text-[11px] text-[var(--color-muted-foreground)]"
            >
              Tampil sebagai{" "}
              <span className="tabular font-semibold text-[var(--color-foreground)]">
                {formatMoney(parsed, currency)}
              </span>
            </p>
          ) : (
            <p
              id="amount-preview"
              className="px-1 text-[11px] text-[var(--color-muted-foreground)]/70"
            >
              Kosongkan kalau belum mau set target
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={parsed === initialTarget && parsed > 0}
        >
          {parsed > 0 ? "Simpan target" : "Simpan tanpa target"}
        </Button>
      </form>

      {/* Reset action — hanya muncul kalau memang ada target tersimpan.
          Pakai form terpisah dengan amount=0 supaya server action
          interpret sebagai "clear". Visual treatment muted (outline +
          destructive text) supaya tidak compete dengan primary CTA. */}
      {initialTarget !== null && initialTarget > 0 && (
        <form action={updateSavingsTargetAction}>
          <input type="hidden" name="amount" value="0" />
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="w-full text-[var(--color-destructive)] hover:bg-[color-mix(in_oklab,var(--color-destructive),transparent_92%)]"
          >
            Hapus target
          </Button>
        </form>
      )}
    </div>
  );
}
