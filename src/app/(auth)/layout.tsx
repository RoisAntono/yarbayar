export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-br from-[var(--color-background)] via-[var(--color-background)] to-[color-mix(in_oklab,var(--color-primary),var(--color-background)_82%)]">
      <div className="max-w-md mx-auto px-6 py-10 min-h-dvh flex flex-col">
        {children}
      </div>
    </div>
  );
}
