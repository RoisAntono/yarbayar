"use client";

import { useActionState, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormDraft, clearFormDraft } from "@/hooks/use-form-draft";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  createPersonalExpenseAction,
  updatePersonalExpenseAction,
  type PersonalExpenseFormState,
} from "./actions";

/**
 * localStorage key for the create-mode draft. Edit mode tidak pakai
 * draft karena initial value sudah dari server — kalau user batal,
 * tidak ada yang hilang.
 */
const DRAFT_KEY = "yb:personal-form:draft";


interface PersonalFormProps {
  /** Pre-fill values for the edit flow. */
  initial?: {
    id: string;
    title: string;
    amount: number;
    category: string | null;
    notes: string | null;
    kind: "expense" | "income";
    spent_at: string;
  };
  /** ISO date (yyyy-MM-dd) used as default in the date picker */
  defaultDate: string;
  /**
   * Default kind for create mode (ignored in edit mode — `initial.kind`
   * wins). Lets entry points like `/personal/new?kind=income` open
   * the form already pointed at income.
   */
  defaultKind?: "expense" | "income";
  mode: "create" | "edit";
}

/**
 * Form catatan keuangan pribadi. Toggle Pengeluaran / Pemasukan di
 * paling atas — itu hal pertama yang user pilih, sisa form ngikut.
 *
 * Pattern:
 *   1. Toggle Kind (segmented control, sticky)
 *   2. Judul (autofocus pada create)
 *   3. Jumlah (big keypad rupiah, warna ikut kind)
 *   4. Kategori (pill grid, hidden untuk income — gak relevan)
 *   5. Tanggal & catatan (collapsed by default)
 */
export function PersonalForm({
  initial,
  defaultDate,
  defaultKind,
  mode,
}: PersonalFormProps) {
  const action =
    mode === "create"
      ? createPersonalExpenseAction
      : updatePersonalExpenseAction;
  const [state, formAction, pending] = useActionState<
    PersonalExpenseFormState,
    FormData
  >(action, undefined);

  const [kind, setKind] = useState<"expense" | "income">(
    initial?.kind ?? defaultKind ?? "expense"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [amountStr, setAmountStr] = useState(
    initial ? String(initial.amount) : ""
  );
  const [category, setCategory] = useState<string | null>(
    initial?.category ?? null
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isIncome = kind === "income";

  // Draft persistence — only on create. Restoring an edit draft would
  // overwrite saved values with stale ones.
  useFormDraft(
    DRAFT_KEY,
    { kind, title, amountStr, category, notes },
    (draft) => {
      if (mode !== "create") return;
      setKind(draft.kind);
      setTitle(draft.title);
      setAmountStr(draft.amountStr);
      setCategory(draft.category);
      setNotes(draft.notes);
      // Auto-open advanced kalau notes terisi — biar user lihat draft
      // yang udah diketik tanpa harus expand manual.
      if (draft.notes) setAdvancedOpen(true);
    }
  );

  // Action wrapper yang clear draft *sebelum* submit. Server action
  // berakhir dengan `redirect()` yang melempar NEXT_REDIRECT — form
  // unmount sebelum useEffect cleanup sempat dipakai. Pattern paling
  // reliable: clear di sini, lalu serahkan ke formAction. Kalau server
  // balikin error, useFormDraft akan resave otomatis lewat next render.
  function handleSubmit(fd: FormData) {
    if (mode === "create") clearFormDraft(DRAFT_KEY);
    return formAction(fd);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {/* Kind picker — segmented control, sticky at top.
          Sengaja besar dan kontras karena ini decision point pertama. */}
      <div className="space-y-1.5">
        <Label>Jenis transaksi</Label>
        <input type="hidden" name="kind" value={kind} />
        <div
          role="radiogroup"
          aria-label="Jenis transaksi"
          className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--color-muted)] p-1"
        >
          <KindOption
            active={kind === "expense"}
            tone="expense"
            icon={<ArrowUpRight className="size-4" />}
            label="Pengeluaran"
            onClick={() => setKind("expense")}
          />
          <KindOption
            active={kind === "income"}
            tone="income"
            icon={<ArrowDownLeft className="size-4" />}
            label="Pemasukan"
            onClick={() => setKind("income")}
          />
        </div>
      </div>

      {/* Judul */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Judul</Label>
        <Input
          id="title"
          name="title"
          placeholder={
            isIncome
              ? "Gaji, freelance, THR…"
              : "Kopi, bensin, jajan…"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus={mode === "create"}
          required
          aria-invalid={!!state?.fieldErrors?.title}
        />
        {state?.fieldErrors?.title && (
          <p className="text-xs text-[var(--color-destructive)]">
            {state.fieldErrors.title}
          </p>
        )}
      </div>

      {/* Jumlah — kartu besar, warna mengikuti kind */}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Jumlah</Label>
        <Card
          className={cn(
            "flex items-center gap-3 p-4 transition-colors",
            // Tinted bg+border ngikut kind: hijau muda buat income,
            // merah muda buat expense. Tanpa tint, expense tampak
            // "tidak punya identity" — beda bobot visual dengan income
            // padahal sama-sama valid input.
            isIncome
              ? "border-[var(--color-success)]/40 bg-[color-mix(in_oklab,var(--color-success),transparent_92%)]"
              : "border-[var(--color-destructive)]/30 bg-[color-mix(in_oklab,var(--color-destructive),transparent_94%)]"
          )}
        >
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-2xl",
              isIncome
                ? "bg-[color-mix(in_oklab,var(--color-success),transparent_85%)] text-[var(--color-success)]"
                : "bg-[color-mix(in_oklab,var(--color-destructive),transparent_85%)] text-[var(--color-destructive)]"
            )}
          >
            {isIncome ? (
              <ArrowDownLeft className="size-4" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </span>
          {/* whitespace-nowrap supaya "+Rp" tidak ke-wrap jadi dua
              baris saat Input mengambil ruang besar di sebelahnya. */}
          <span
            className={cn(
              "shrink-0 whitespace-nowrap font-semibold",
              isIncome
                ? "text-[var(--color-success)]"
                : "text-[var(--color-destructive)]"
            )}
          >
            {isIncome ? "+Rp" : "−Rp"}
          </span>
          <Input
            id="amount"
            name="amount"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={formatRupiahInput(amountStr)}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, "");
              setAmountStr(raw);
            }}
            required
            aria-invalid={!!state?.fieldErrors?.amount}
            className="border-0 bg-transparent text-2xl font-bold tracking-tight tabular shadow-none focus-visible:ring-0 px-0"
          />
        </Card>
        {state?.fieldErrors?.amount && (
          <p className="text-xs text-[var(--color-destructive)]">
            {state.fieldErrors.amount}
          </p>
        )}
      </div>

      {/* Kategori — hanya untuk pengeluaran. Income tidak butuh
          kategori untuk MVP; nanti bisa ditambah preset kalau perlu. */}
      {!isIncome && (
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <input type="hidden" name="category" value={category ?? ""} />
          <div className="grid grid-cols-3 gap-1.5">
            {CATEGORIES.filter((c) => c.slug !== "lain").map((c) => {
              const active = category === c.slug;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategory(active ? null : c.slug)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-2xl border px-2.5 py-2 text-xs font-medium transition-all active:scale-95",
                    active
                      ? "border-transparent bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-pop-accent)]"
                      : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                  )}
                >
                  <span>{c.emoji}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            Skip aja, nanti kami tebak.
          </p>
        </div>
      )}

      {/* Advanced — date + notes hidden by default */}
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="text-xs font-medium text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
      >
        {advancedOpen ? "Sembunyikan opsi" : "Tanggal & catatan"}
      </button>

      {advancedOpen && (
        <div className="space-y-4 float-in">
          <div className="space-y-1.5">
            <Label htmlFor="spent_at">Tanggal</Label>
            <Input
              id="spent_at"
              name="spent_at"
              type="date"
              defaultValue={
                initial ? initial.spent_at.slice(0, 10) : defaultDate
              }
              aria-invalid={!!state?.fieldErrors?.spent_at}
            />
            {state?.fieldErrors?.spent_at && (
              <p className="text-xs text-[var(--color-destructive)]">
                {state.fieldErrors.spent_at}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isIncome ? "Dari siapa? (opsional)" : "Catatan (opsional)"}
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Hidden fields when advanced is collapsed — keep date so
          server action gets a value, and notes (which lives in state)
          stays included in form data. */}
      {!advancedOpen && (
        <>
          <input
            type="hidden"
            name="spent_at"
            value={initial ? initial.spent_at.slice(0, 10) : defaultDate}
          />
          {notes && <input type="hidden" name="notes" value={notes} />}
        </>
      )}

      {state?.error && (
        <p className="rounded-xl bg-[var(--color-destructive)]/10 px-3 py-2 text-sm text-[var(--color-destructive)]">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full gap-2"
        loading={pending}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : mode === "create" ? (
          isIncome ? (
            "Simpan pemasukan"
          ) : (
            "Simpan pengeluaran"
          )
        ) : (
          "Simpan perubahan"
        )}
      </Button>
    </form>
  );
}

/**
 * A single radio-style segment in the kind picker.
 *
 * Color semantics ikut convention finance apps:
 *   - Income → success (hijau): pemasukan adalah hal positif
 *   - Expense → destructive (rose): pengeluaran adalah hal yang
 *     mengurangi balance, butuh perhatian
 *
 * Kalau active state pengeluaran cuma hitam/dark, secara visual
 * kontradiksi dengan tab pemasukan yang hijau. User mengira itu
 * "default" / "neutral" padahal harusnya semantik yang jelas.
 */
function KindOption({
  active,
  tone,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  tone: "expense" | "income";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all active:scale-95",
        active
          ? tone === "income"
            ? "bg-[var(--color-success)] text-white shadow-[var(--shadow-card)]"
            : "bg-[var(--color-destructive)] text-white shadow-[var(--shadow-card)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/** Format raw digits as IDR without currency prefix (handled by adornment). */
function formatRupiahInput(raw: string): string {
  if (!raw) return "";
  const n = Number(raw);
  if (Number.isNaN(n)) return raw;
  return n.toLocaleString("id-ID");
}
