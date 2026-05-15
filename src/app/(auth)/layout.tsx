export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain relative min-h-dvh overflow-hidden">
      {/* Decorative aurora wash anchored top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 100% 0%, color-mix(in oklab, var(--color-accent) 22%, transparent), transparent 60%), radial-gradient(80% 60% at 0% 100%, color-mix(in oklab, oklch(0.4 0.12 265) 20%, transparent), transparent 60%), var(--color-background)",
        }}
      />
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
        {children}
      </div>
    </div>
  );
}
