"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { Sparkles, TrendingUp } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import {
  buildExpenseTimeline,
  totalInRange,
  type TimelinePoint,
  type TimelineRange,
} from "@/lib/timeline";
import { formatRupiah, formatRupiahShort, memberColor } from "@/lib/utils";

interface Member {
  id: string;
  display_name: string;
}

interface ExpenseInput {
  amount: number;
  spent_at: string;
  paid_by_member_id: string;
  splits: { member_id: string; amount: number }[];
}

interface ExpenseTimelineProps {
  members: Member[];
  expenses: ExpenseInput[];
  /**
   * "group" → multi-line per member, total area underneath.
   * "single" → just one cumulative area (used on home/dashboard).
   */
  variant?: "group" | "single";
}

const RANGE_OPTIONS: { value: TimelineRange; label: string }[] = [
  { value: "1D", label: "1H" },
  { value: "1W", label: "1M" },
  { value: "1M", label: "1B" },
];

export function ExpenseTimeline({
  members,
  expenses,
  variant = "group",
}: ExpenseTimelineProps) {
  const [range, setRange] = useState<TimelineRange>("1W");

  const data = useMemo(
    () => buildExpenseTimeline(expenses, members, { range }),
    [expenses, members, range]
  );
  const total = totalInRange(data);

  // Members visible (toggleable) — start with all on
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hasData = total > 0;

  return (
    <section className="space-y-3">
      {/* Header — total + range toggle */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            <Sparkles className="size-3.5" />
            Total {labelForRange(range)}
          </p>
          <p className="font-display tabular mt-0.5 text-3xl leading-none tracking-tight">
            {formatRupiah(total)}
          </p>
        </div>
        <Segmented
          options={RANGE_OPTIONS}
          value={range}
          onChange={(v) => setRange(v)}
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)]">
        {hasData ? (
          <ResponsiveContainer width="100%" height={180}>
            {variant === "single" ? (
              <AreaChart data={data} margin={{ top: 8, left: -16, right: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v: number) => formatRupiahShort(v)}
                  width={48}
                />
                <Tooltip content={<ChartTooltip members={members} hidden={hidden} variant={variant} />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-accent)"
                  strokeWidth={2.5}
                  fill="url(#totalFill)"
                  isAnimationActive
                  animationDuration={500}
                />
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 8, left: -16, right: 8, bottom: 0 }}>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                  tickFormatter={(v: number) => formatRupiahShort(v)}
                  width={48}
                />
                <Tooltip content={<ChartTooltip members={members} hidden={hidden} variant={variant} />} />
                {members.map((m) => (
                  <Line
                    key={m.id}
                    type="monotone"
                    dataKey={m.id}
                    name={m.display_name}
                    stroke={memberColor(m.display_name)}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive
                    animationDuration={500}
                    hide={hidden.has(m.id)}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] flex-col items-center justify-center gap-1 text-center">
            <TrendingUp className="size-6 text-[var(--color-muted-foreground)]/60" />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Belum ada pengeluaran di rentang ini
            </p>
          </div>
        )}
      </div>

      {/* Legend — togglable (only for multi-line variant) */}
      {variant === "group" && members.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => {
            const off = hidden.has(m.id);
            const color = memberColor(m.display_name);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                aria-pressed={!off}
                className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2.5 py-1 text-xs transition-all active:scale-95"
                style={off ? { opacity: 0.4 } : undefined}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="font-medium">{m.display_name}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function labelForRange(r: TimelineRange) {
  return r === "1D" ? "24 jam" : r === "1W" ? "7 hari" : "30 hari";
}

type ChartTooltipProps = TooltipProps<number, string> & {
  members: Member[];
  hidden: Set<string>;
  variant: "group" | "single";
};

function ChartTooltip(props: ChartTooltipProps) {
  const { active, members, hidden, variant } = props;
  // payload/label are runtime-injected by Recharts but not typed on its
  // TooltipProps in v3, so we read them via index access.
  const payload = (props as unknown as { payload?: { payload: TimelinePoint }[] }).payload;
  const label = (props as unknown as { label?: string }).label;
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as TimelinePoint | undefined;
  if (!point) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs shadow-[var(--shadow-float)]">
      <p className="font-semibold text-[var(--color-foreground)]">{label}</p>
      <p className="tabular mt-0.5 text-[var(--color-muted-foreground)]">
        Total: <span className="font-semibold text-[var(--color-foreground)]">{formatRupiah(Number(point.total ?? 0))}</span>
      </p>
      {variant === "group" && (
        <ul className="mt-1.5 space-y-0.5 border-t border-[var(--color-border)] pt-1.5">
          {members
            .filter((m) => !hidden.has(m.id))
            .map((m) => {
              const v = Number(point[m.id] ?? 0);
              if (v === 0) return null;
              return (
                <li
                  key={m.id}
                  className="tabular flex items-center gap-1.5 text-[11px]"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: memberColor(m.display_name) }}
                    aria-hidden
                  />
                  <span className="text-[var(--color-muted-foreground)]">
                    {m.display_name}
                  </span>
                  <span className="ml-auto font-semibold">
                    {formatRupiah(v)}
                  </span>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
