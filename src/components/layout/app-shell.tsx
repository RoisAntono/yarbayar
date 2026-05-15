import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-dvh bg-[var(--color-background)]">
      {/* Bottom space accounts for the floating nav (~64px pill + ~24px FAB overhang) */}
      <main className="mx-auto w-full max-w-md pb-32">{children}</main>
      <BottomNav />
    </div>
  );
}
