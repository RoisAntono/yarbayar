import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrencyConfig } from "@/lib/currency";
import { getCurrentUser, getProfile } from "@/lib/data";
import { GoalForm } from "./goal-form";

export const metadata = { title: "Target nabung" };
export const dynamic = "force-dynamic";

/**
 * Goal picker page.
 *
 * Pattern mirip /profile/currency: full page dengan disclaimer card di
 * atas + form di bawah. Disclaimer-nya beda fokus — currency picker
 * jelasin "format-only", goal picker jelasin "motivasi visual aja".
 *
 * Goal value disimpan di profile.monthly_savings_target. Render di
 * /personal sebagai progress card (lihat HeroGoalCard di sana). Kalau
 * NULL, /personal tampil empty CTA balik ke sini.
 */
export default async function GoalPickerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  const currency = getCurrencyConfig(profile?.currency).code;
  const target = profile?.monthly_savings_target ?? null;

  return (
    <>
      <PageHeader
        title="Target nabung"
        subtitle="Set goal bulanan"
        back
      />

      <div className="space-y-4 px-4 py-4">
        {/* Disclaimer — ini bukan auto-saving feature, cuma visual
            motivator. Tone: educative, bukan apologetic. Penting
            supaya user ngga ekspektasi "uang akan otomatis dipotong"
            atau ada lock saving mechanism. */}
        <Card className="space-y-1.5 p-4 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
          <p className="font-semibold text-[var(--color-foreground)]">
            Cuma motivasi visual
          </p>
          <p>
            Target ini buat ngingetin progress kamu — kami nggak mindahin
            uang, nggak ngunci, dan nggak kirim notifikasi nyebelin.
            Cashflow bulan ini dihitung dari pemasukan dikurangi pengeluaran.
          </p>
        </Card>

        <Card className="p-4">
          <GoalForm initialTarget={target} currency={currency} />
        </Card>

        <p className="px-1 text-center text-[10px] leading-relaxed text-[var(--color-muted-foreground)]/70">
          Reset tiap bulan otomatis — progress bar Beranda baca cashflow
          bulan berjalan, bukan akumulasi.
        </p>
      </div>
    </>
  );
}
