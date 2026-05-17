/**
 * Pure functions that bucket expenses into time-series points for the
 * expense chart. No DB/network — given raw expense rows + members, this
 * produces ready-to-render Recharts data.
 *
 * Cumulative semantics: each bucket contains the running total for that
 * member up to and including that bucket's window. So the chart line
 * always goes flat or up — never resets. That's the "crypto chart" feel
 * the user asked for.
 */

export type TimelineRange = "1D" | "1W" | "1M";

interface TimelineExpense {
  amount: number;
  /** ISO timestamp */
  spent_at: string;
  paid_by_member_id: string;
  splits: { member_id: string; amount: number }[];
}

interface TimelineMember {
  id: string;
  display_name: string;
}

/** A single point in the chart — one bucket of time. */
export interface TimelinePoint {
  /** ms since epoch — Recharts uses this for X axis ordering */
  t: number;
  /** Pre-formatted label for tooltips/x-axis ("17:00", "Sen 12 Mei", etc.) */
  label: string;
  /** Cumulative TOTAL group spend up to this bucket */
  total: number;
  /** Cumulative SHARE per member up to this bucket. Key = member id. */
  [memberId: string]: number | string;
}

export interface TimelineConfig {
  range: TimelineRange;
  /** Now() override for testing — defaults to new Date() */
  now?: Date;
}

interface RangeShape {
  /** Total span covered, ms */
  spanMs: number;
  /** Width of one bucket, ms */
  bucketMs: number;
  /** Format a Date into a short axis/tooltip label */
  format: (d: Date) => string;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const RANGE_SHAPES: Record<TimelineRange, RangeShape> = {
  // 24h, hourly buckets — "today's spend by hour"
  "1D": {
    spanMs: 24 * HOUR,
    bucketMs: HOUR,
    format: (d) =>
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  },
  // 7 days, daily buckets
  "1W": {
    spanMs: 7 * DAY,
    bucketMs: DAY,
    format: (d) =>
      d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
  },
  // 30 days, daily buckets
  "1M": {
    spanMs: 30 * DAY,
    bucketMs: DAY,
    format: (d) =>
      d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
  },
};

/**
 * Snap a timestamp DOWN to its bucket-start. For hourly buckets we strip
 * minutes/seconds; for daily buckets we strip hours too (local midnight).
 */
function bucketStart(t: number, bucketMs: number): number {
  const d = new Date(t);
  if (bucketMs === HOUR) {
    d.setMinutes(0, 0, 0);
    return d.getTime();
  }
  // Daily — local midnight
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Convert raw expenses into a Recharts-friendly time series. The series
 * always covers the full range so the X axis doesn't squish even when
 * data is sparse. Members with zero spend still get a flat line at 0,
 * so the legend stays consistent.
 */
export function buildExpenseTimeline(
  expenses: TimelineExpense[],
  members: TimelineMember[],
  { range, now = new Date() }: TimelineConfig
): TimelinePoint[] {
  const shape = RANGE_SHAPES[range];
  const endT = bucketStart(now.getTime(), shape.bucketMs) + shape.bucketMs;
  const startT = endT - shape.spanMs;

  // Pre-build an ordered list of bucket timestamps spanning the range.
  // We keep these in a deterministic sequence so the chart never reorders.
  const buckets: number[] = [];
  for (let t = startT; t < endT; t += shape.bucketMs) buckets.push(t);

  // Per-member spend within each bucket (NOT cumulative yet).
  const perBucket = new Map<number, Map<string, number>>();
  for (const t of buckets) perBucket.set(t, new Map());

  for (const e of expenses) {
    const ts = new Date(e.spent_at).getTime();
    if (ts < startT || ts >= endT) continue;
    const bucket = bucketStart(ts, shape.bucketMs);
    const slot = perBucket.get(bucket);
    if (!slot) continue;

    // Each split is a member's portion of the bill — that's their "spend"
    // for chart purposes (consumption-based, not who-paid-based).
    for (const s of e.splits) {
      slot.set(s.member_id, (slot.get(s.member_id) ?? 0) + Number(s.amount));
    }
  }

  // Walk buckets, accumulating running totals.
  const cumulative = new Map<string, number>();
  for (const m of members) cumulative.set(m.id, 0);

  return buckets.map((t) => {
    const slot = perBucket.get(t)!;
    let total = 0;
    for (const m of members) {
      const inc = slot.get(m.id) ?? 0;
      const next = (cumulative.get(m.id) ?? 0) + inc;
      cumulative.set(m.id, next);
      total += next;
    }

    const point: TimelinePoint = {
      t,
      label: shape.format(new Date(t)),
      total,
    };
    for (const m of members) {
      point[m.id] = cumulative.get(m.id) ?? 0;
    }
    return point;
  });
}

/**
 * Total spend across the whole range — quick stat to display next to the
 * chart so it has a single anchor number.
 */
export function totalInRange(points: TimelinePoint[]): number {
  return points.length === 0 ? 0 : Number(points[points.length - 1].total ?? 0);
}
