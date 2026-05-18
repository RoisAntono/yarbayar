"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { categoryEmoji, categoryLabel } from "@/lib/categories";
import { formatMoney } from "@/lib/utils";

interface ExpenseRow {
  id: string;
  title: string;
  amount: number;
  spent_at: string;
  paid_by_member_id: string;
  category: string | null;
  splits: { member_id: string; amount: number }[];
}

interface MemberLite {
  id: string;
  display_name: string;
  profile_id: string | null;
}

interface ExpenseGroupingsProps {
  groupId: string;
  expenses: ExpenseRow[];
  members: MemberLite[];
  myMemberId: string | null;
  /** ISO 4217 code untuk format amount (default IDR). */
  currency?: string;
}

type Mode = "category" | "date";

const MODES: { value: Mode; label: string }[] = [
  { value: "category", label: "Kategori" },
  { value: "date", label: "Tanggal" },
];

/**
 * Toggle between two ways of browsing the same expense list:
 *
 *   - "Kategori" — group by inferred category, ordered by total spend
 *     (highest first). Old default; useful for "where did the money go?".
 *
 *   - "Tanggal" — group by the day the expense happened, newest first.
 *     Useful for the timeline mental model: "what did we spend on
 *     Tuesday?".
 *
 * Both modes use the same collapsible card pattern and start fully
 * collapsed — header (icon, label, count, total) is enough to answer
 * "is there anything in this bucket?" without expanding.
 */
export function ExpenseGroupings({
  groupId,
  expenses,
  members,
  myMemberId,
  currency = "IDR",
}: ExpenseGroupingsProps) {
  const [mode, setMode] = useState<Mode>("category");
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  const buckets = useMemo(() => {
    if (mode === "category") return groupByCategory(expenses);
    return groupByDate(expenses);
  }, [mode, expenses]);

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <Segmented
        options={MODES}
        value={mode}
        onChange={(v) => setMode(v as Mode)}
        className="w-full justify-between [&_button]:flex-1"
      />

      <div className="space-y-2.5">
        {buckets.map((b) => (
          <BucketCard
            key={b.key}
            label={b.label}
            sublabel={b.sublabel}
            emoji={b.emoji}
            total={b.total}
            items={b.items}
            groupId={groupId}
            memberMap={memberMap}
            myMemberId={myMemberId}
            currency={currency}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Bucketing — pure functions
// ---------------------------------------------------------------

interface Bucket {
  key: string;
  label: string;
  sublabel: string;
  emoji: string;
  total: number;
  items: ExpenseRow[];
}

function groupByCategory(expenses: ExpenseRow[]): Bucket[] {
  const m = new Map<string, ExpenseRow[]>();
  for (const e of expenses) {
    const key = e.category ?? "";
    const arr = m.get(key) ?? [];
    arr.push(e);
    m.set(key, arr);
  }
  return Array.from(m.entries())
    .map(([slug, items]) => ({
      key: slug || "uncategorized",
      label: slug ? categoryLabel(slug) : "Tanpa kategori",
      sublabel: `${items.length} transaksi`,
      emoji: slug ? categoryEmoji(slug) : "📦",
      total: items.reduce((s, e) => s + e.amount, 0),
      items,
    }))
    .sort((a, b) => b.total - a.total);
}

function groupByDate(expenses: ExpenseRow[]): Bucket[] {
  const m = new Map<string, ExpenseRow[]>();
  for (const e of expenses) {
    // Bucket by local-day key. Using YYYY-MM-DD so same date in
    // different timezones still aggregates consistently for the user
    // looking at the page locally.
    const d = new Date(e.spent_at);
    const key = format(d, "yyyy-MM-dd");
    const arr = m.get(key) ?? [];
    arr.push(e);
    m.set(key, arr);
  }
  return Array.from(m.entries())
    .map(([key, items]) => {
      const d = new Date(key);
      return {
        key,
        // Friendly label — "Sen, 12 Mei". Year omitted unless older
        // than this calendar year, to keep the header short.
        label: format(d, "EEE, d MMMM", { locale: idLocale }),
        sublabel: `${items.length} transaksi`,
        emoji: "📅",
        total: items.reduce((s, e) => s + e.amount, 0),
        items,
      };
    })
    // Newest first — most recent day at the top
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

// ---------------------------------------------------------------
// Single collapsible bucket — same shape across both modes
// ---------------------------------------------------------------

function BucketCard({
  label,
  sublabel,
  emoji,
  total,
  items,
  groupId,
  memberMap,
  myMemberId,
  currency,
}: {
  label: string;
  sublabel: string;
  emoji: string;
  total: number;
  items: ExpenseRow[];
  groupId: string;
  memberMap: Map<string, MemberLite>;
  myMemberId: string | null;
  currency: string;
}) {
  return (
    // Always collapsed by default — once you have many buckets, having
    // them auto-expand would push the screen far past the fold.
    <details className="group">
      <summary className="list-none cursor-pointer">
        <Card className="flex items-center gap-3 p-3.5 transition-all duration-200 hover:bg-[var(--color-muted)]">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--color-muted)] text-xl">
            {emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold tracking-tight">{label}</p>
            <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
              {sublabel}
            </p>
          </div>
          <p className="tabular shrink-0 font-semibold text-sm">
            {formatMoney(total, currency)}
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
                      {format(new Date(e.spent_at), "d MMM HH:mm", {
                        locale: idLocale,
                      })}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-semibold">
                      {formatMoney(e.amount, currency)}
                    </p>
                    {myMemberId && myShare > 0 && (
                      <Badge
                        variant={
                          payer?.id === myMemberId ? "success" : "secondary"
                        }
                        className="tabular mt-1 text-[10px]"
                      >
                        {payer?.id === myMemberId
                          ? `+${formatMoney(e.amount - myShare, currency)}`
                          : `−${formatMoney(myShare, currency)}`}
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
