import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <>
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8">
          <div className="size-14 rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] grid place-items-center text-2xl shadow-[var(--shadow-pop)] mb-5">
            🤝
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Buat akun baru</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            Mulai catat dan bagi pengeluaran bareng teman dalam hitungan detik.
          </p>
        </div>
        <RegisterForm />
      </div>
      <p className="text-center text-sm text-[var(--color-muted-foreground)] py-6">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--color-primary)]"
        >
          Masuk
        </Link>
      </p>
    </>
  );
}
