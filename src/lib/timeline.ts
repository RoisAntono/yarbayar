/**
 * Pure functions that bucket expenses into time-series points for the
 * expense chart. No DB/network — given raw expense rows + members, this
 * produces ready-to-render Recharts data.
 *
 * Per-bucket semantics: each point shows the spend WITHIN that bucket
 * window only (per-expense, not cumulative). Empty buckets are 0, busy
 * buckets spike. This produces the "gunung" mountain shape the user
 * wanted — line rises at active hours/days and drops back to zero in
 * between, instead of monotonically climbing.
 *
 * Earlier this returned cumulative running totals which gave a "crypto
 * chart" look, but that obscured the per-event signal — you couldn't
 * see *when* the actual spending happened, only how the running total
 * grew.
 */


export type TimelineRange = "1D" | "1W" | "1M";

interface TimelineExpense {
  amount: number;
  /** ISO timestamp of when the expense was spent (user-provided) */
  spent_at: string;
  /**
   * ISO timestamp of when the row was inserted. Used as a fallback when
   * `spent_at` is exactly midnight (00:00:00) — that often means the
   * user picked a date but no time, and pinning it to 00:00 hides the
   * actual hour-of-day from the timeline chart. Older rows in the DB
   * that were created before time-preservation was added benefit from
   * this fallback automatically.
   */
  created_at?: string;
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
  /** Total group spend WITHIN this bucket window (not cumulative) */
  total: number;
  /** Per-member share spent within this bucket. Key = member id. */
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
    // If spent_at is exactly midnight (00:00:00.000), the user almost
    // certainly only picked a date in the form — so the hour is
    // meaningless. Prefer created_at, which captures the actual moment
    // the user logged the expense, and gives the chart a real hour-of-
    // day to bucket on.
    const spent = new Date(e.spent_at);
    const isMidnight =
      spent.getHours() === 0 &&
      spent.getMinutes() === 0 &&
      spent.getSeconds() === 0 &&
      spent.getMilliseconds() === 0;
    const ts =
      isMidnight && e.created_at ? new Date(e.created_at).getTime() : spent.getTime();
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

  // Walk buckets, emitting per-bucket spend (no accumulation). Each
  // point reflects ONLY what happened in its window — that's what
  // produces the up-and-down mountain shape.
  return buckets.map((t) => {
    const slot = perBucket.get(t)!;
    let total = 0;
    const point: TimelinePoint = {
      t,
      label: shape.format(new Date(t)),
      total: 0,
    };
    for (const m of members) {
      const v = slot.get(m.id) ?? 0;
      point[m.id] = v;
      total += v;
    }
    point.total = total;
    return point;
  });
}

/**
 * Total spend across the whole range — sum of every bucket's `total`.
 * (Was previously the last cumulative point; updated to match the new
 * per-bucket semantics.)
 */
export function totalInRange(points: TimelinePoint[]): number {
  let s = 0;
  for (const p of points) s += Number(p.total ?? 0);
  return s;
}


