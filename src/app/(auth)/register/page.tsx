import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <>
      <div className="flex flex-1 flex-col justify-center">
        <div className="mb-8 float-in">
          <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] text-2xl shadow-[var(--shadow-pop-accent)]">
            🤝
          </div>
          <h1 className="text-4xl tracking-tight">
            <span className="font-display-italic">Halo,</span>{" "}
            <span className="font-medium">teman baru.</span>
          </h1>
          <p className="mt-2 text-[var(--color-muted-foreground)]">
            Mulai catat dan bagi pengeluaran bareng teman dalam hitungan detik.
          </p>
        </div>
        <RegisterForm />
      </div>
      <p className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--color-foreground)] underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </>
  );
}
