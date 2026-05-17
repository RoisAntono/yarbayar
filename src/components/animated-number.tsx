"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  /** ms duration */
  duration?: number;
  className?: string;
  /** Format the displayed text. Defaults to formatMoney with given currency. */
  format?: (n: number) => string;
  /**
   * Currency code untuk default formatter. Diabaikan kalau `format`
   * di-supply manual. Default IDR — backwards compat dengan callsite
   * yang belum currency-aware.
   */
  currency?: string;
}

/**
 * Lightweight count-up. Previously used Framer Motion (~50KB gz) which
 * was wildly overkill for tweening a single number — that import alone
 * showed up on every hero card and noticeably hurt cold start on low-end
 * Android. This version uses requestAnimationFrame, no deps.
 *
 * Also respects `prefers-reduced-motion`: just snaps to the final value.
 */
export function AnimatedNumber({
  value,
  duration = 700,
  className,
  format,
  currency = "IDR",
}: AnimatedNumberProps) {
  // Default formatter: pakai currency prop, fallback IDR. Stable
  // closure via inline arrow → tidak trigger re-render saat parent
  // re-render karena currency string identity stable.
  const formatFn = format ?? ((n: number) => formatMoney(n, currency));
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    // Honor user setting — no animation if reduced motion is requested.
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || duration <= 0) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOut cubic — feels more natural than linear
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{formatFn(Math.round(display))}</span>;
}
