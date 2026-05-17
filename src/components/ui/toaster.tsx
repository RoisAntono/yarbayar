"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Custom Toaster wrapper buat Yarbayar.
 *
 * Default sonner itu polos banget — pakai bg solid + border kotak yang
 * lawan design system kita (rounded-3xl, glass, shadow-pop). Wrapper
 * ini override via `toastOptions.classNames` supaya toast match semua
 * Card lain di app:
 *
 *   - rounded-2xl border + shadow-float (sama kayak settlement card)
 *   - glass background (color-mix bg-card 88% transparent + backdrop-blur)
 *   - font-medium tracking-tight headline (sama kayak Card title)
 *   - icon di kiri pakai grid + size-9 + rounded-xl bg tinted (success
 *     hijau, error merah, warning kuning) — konsisten dengan ikon di
 *     hero/settings rows
 *
 * `position="top-center"` dipertahankan karena mobile-first — toast di
 * atas tidak collision dengan FAB tengah dan bottom nav. `closeButton`
 * di-enable supaya destructive feedback (purge / unmark) bisa di-stay
 * lebih lama tanpa user dipaksa nunggu.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      closeButton
      duration={3500}
      // visibleToasts: max 3 stacked at once — lebih dari ini = noisy
      visibleToasts={3}
      // theme: ikut system — globals.css udah handle dark mode via CSS var
      theme="system"
      toastOptions={{
        // Disable sonner's built-in colored bg (richColors). Kita pakai
        // glass + tinted icon container per-type biar lebih ringan
        // visually + match Card lain.
        unstyled: false,
        classNames: {
          // Container utama — glass card pattern
          toast: [
            // Layout: pakai flex via class (sonner default udah flex)
            "group/toast",
            "rounded-2xl border",
            "bg-[color-mix(in_oklab,var(--color-card)_94%,transparent)]",
            "border-[color-mix(in_oklab,var(--color-foreground)_8%,transparent)]",
            "backdrop-blur-xl backdrop-saturate-150",
            "shadow-[var(--shadow-float)]",
            "px-4 py-3.5",
            // Typography
            "text-[var(--color-foreground)]",
            "font-sans",
            // Animation: sonner pakai inline transform, kita perhalus
            // dengan motion-reduce respect (sudah di globals.css).
          ].join(" "),
          // Title — bold, tracking-tight match Card heading
          title: "text-sm font-semibold tracking-tight leading-snug",
          // Description — muted color, looser leading
          description:
            "text-xs leading-relaxed mt-0.5 text-[var(--color-muted-foreground)]",
          // Icon container — sonner inject icon dari built-in lucide
          // sebenernya, tapi kita coat-bg supaya match palette.
          icon: [
            "grid size-9 shrink-0 place-items-center rounded-xl mr-1",
            "[&_svg]:size-4 [&_svg]:stroke-[2.5]",
          ].join(" "),
          // Per-type override untuk icon container background.
          // Gen-Z principle: hijau = success, merah = destructive,
          // saffron = info/neutral, kuning = warning.
          success: [
            "[&_[data-icon]]:bg-[color-mix(in_oklab,var(--color-success),transparent_82%)]",
            "[&_[data-icon]]:text-[var(--color-success)]",
          ].join(" "),
          error: [
            "[&_[data-icon]]:bg-[color-mix(in_oklab,var(--color-destructive),transparent_82%)]",
            "[&_[data-icon]]:text-[var(--color-destructive)]",
          ].join(" "),
          warning: [
            "[&_[data-icon]]:bg-[color-mix(in_oklab,var(--color-warning,oklch(0.78_0.15_75)),transparent_82%)]",
            "[&_[data-icon]]:text-[var(--color-warning,oklch(0.55_0.15_75))]",
          ].join(" "),
          info: [
            "[&_[data-icon]]:bg-[color-mix(in_oklab,var(--color-accent),transparent_82%)]",
            "[&_[data-icon]]:text-[var(--color-accent)]",
          ].join(" "),
          // Action button (untuk toast.message dengan action prop) —
          // accent variant yang konsisten dengan Button accent.
          actionButton: [
            "rounded-xl px-3 py-1.5 text-xs font-semibold",
            "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
            "shadow-[var(--shadow-pop-accent)]",
            "active:scale-95 transition-transform",
          ].join(" "),
          cancelButton: [
            "rounded-xl px-3 py-1.5 text-xs font-medium",
            "text-[var(--color-muted-foreground)]",
            "hover:bg-[var(--color-muted)]",
            "active:scale-95 transition-all",
          ].join(" "),
          // Close button — top-right, low-stakes ghost style
          closeButton: [
            "rounded-full border-0",
            "bg-[color-mix(in_oklab,var(--color-foreground)_6%,transparent)]",
            "text-[var(--color-muted-foreground)]",
            "hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            "transition-colors",
          ].join(" "),
        },
      }}
    />
  );
}
