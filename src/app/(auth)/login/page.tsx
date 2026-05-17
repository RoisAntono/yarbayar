import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

/**
 * Login page accepts a `next` query param so flows like /join/[token]
 * can redirect users back to where they came from after auth. The
 * value is sanitized server-side in `loginAction` (must be /-prefixed,
 * no protocol-relative escapes) — see `safeNext` in actions.ts.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "";

  // Carry `next` into the register link too — if user clicks "Daftar"
  // from a /join flow, the post-register redirect should still bring
  // them back to the invite.
  const registerHref = safeNext
    ? `/register?next=${encodeURIComponent(safeNext)}`
    : "/register";

  return (
    <>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 float-in">
          <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-[var(--color-ink)] text-[var(--color-on-ink)] text-2xl shadow-[var(--shadow-pop)]">
            💸
          </div>
          <h1 className="text-4xl tracking-tight">
            <span className="font-display-italic">Selamat datang</span>
            <br />
            <span className="font-medium">kembali.</span>
          </h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            Masuk ke Yarbayar untuk lanjut catat pengeluaran bareng teman.
          </p>
        </div>
        <LoginForm next={safeNext} />
      </div>
      <p className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
        Belum punya akun?{" "}
        <Link
          href={registerHref}
          className="font-semibold text-[var(--color-foreground)] underline-offset-4 hover:underline"
        >
          Daftar
        </Link>
      </p>
    </>
  );
}
