"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  side?: "bottom" | "right";
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-first slide-up bottom sheet (or right drawer).
 * Closes on backdrop click, Escape key, or swipe-down (bottom variant only).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  side = "bottom",
  children,
  className,
}: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  // Track touch for swipe-down on bottom sheet
  const startY = React.useRef<number | null>(null);
  const dragRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState(0);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    if (side !== "bottom") return;
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (side !== "bottom" || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setDrag(delta);
  };
  const onTouchEnd = () => {
    if (drag > 120) onOpenChange(false);
    setDrag(0);
    startY.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-black/40 animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={dragRef}
        className={cn(
          "relative bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-xl flex flex-col",
          side === "bottom"
            ? "mt-auto w-full max-h-[92vh] rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
            : "ml-auto h-full w-[88vw] max-w-md",
          className
        )}
        style={
          side === "bottom"
            ? {
                transform: `translateY(${drag}px)`,
                transition: drag === 0 ? "transform 200ms ease-out" : "none",
              }
            : undefined
        }
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {side === "bottom" && (
          <div className="flex justify-center pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-[var(--color-border)]" />
          </div>
        )}
        {(title || description) && (
          <div className="flex items-start justify-between gap-2 px-5 pt-3 pb-2">
            <div>
              {title && <h2 className="text-lg font-semibold">{title}</h2>}
              {description && (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Tutup"
              className="rounded-full p-1.5 hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-5 flex-1">{children}</div>
      </div>
    </div>
  );
}
