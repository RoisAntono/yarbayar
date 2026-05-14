"use client";

import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";
import { formatRupiah } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  /** ms duration */
  duration?: number;
  className?: string;
  /** Format the displayed text. Defaults to Rupiah. */
  format?: (n: number) => string;
}

/**
 * Smoothly counts from the previous value to the new value. Useful for
 * making summary numbers (saldo, total expense) feel alive instead of
 * snapping into place.
 */
export function AnimatedNumber({
  value,
  duration = 700,
  className,
  format = (n) => formatRupiah(n),
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => format(Math.round(v)));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: duration / 1000,
      ease: "easeOut",
    });
    return () => controls.stop();
  }, [value, duration, motionValue]);

  return <motion.span className={className}>{display}</motion.span>;
}
