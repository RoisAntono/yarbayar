import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-background)]">
      <main className="flex-1 max-w-md w-full mx-auto pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
