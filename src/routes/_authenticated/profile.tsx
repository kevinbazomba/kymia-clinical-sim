import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard, updateProfile } from "@/lib/consultation.functions";
import { getMyJuryWins } from "@/lib/jury.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";
import { LanguageSettings } from "@/components/LanguageSwitch";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: makeT(getStoredLang())("profile.meta.title") }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang } = useI18n();
  const dashFn = useServerFn(getDashboard);
  const updFn = useServerFn(updateProfile);
  const qc = useQueryClient();
  const winsFn = useServerFn(getMyJuryWins);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashFn() });
  const { data: wins } = useQuery({ queryKey: ["my-jury-wins"], queryFn: () => winsFn() });

  const [form, setForm] = useState({ display_name: "", level: "student", country: "" });
  useEffect(() => {
    if (data?.profile) {
      setForm({
        display_name: data.profile.display_name ?? "",
        level: data.profile.level ?? "student",
        country: data.profile.country ?? "",
      });
    }
  }, [data?.profile]);

  const mut = useMutation({
    mutationFn: (v: typeof form) => updFn({ data: v }),
    onSuccess: () => {
      toast.success(t("profile.toast.updated"));
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("profile.toast.error")),
  });

  const dateLocale = lang === "en" ? "en-US" : "fr-FR";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-serif text-4xl">{t("profile.header.title")}</h1>
        <p className="text-muted-foreground">{t("profile.header.subtitle")}</p>
      </header>

      <form
        onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
        className="space-y-4 rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]"
      >
        <div>
          <Label>{t("profile.form.displayName")}</Label>
          <Input value={form.display_name} onChange={(e) => setForm((s) => ({ ...s, display_name: e.target.value }))} className="mt-1" maxLength={60} required />
        </div>
        <div>
          <Label>{t("profile.form.level")}</Label>
          <select
            value={form.level}
            onChange={(e) => setForm((s) => ({ ...s, level: e.target.value }))}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="student">{t("common.levels.student")}</option>
            <option value="extern">{t("common.levels.extern")}</option>
            <option value="intern">{t("common.levels.intern")}</option>
            <option value="resident">{t("common.levels.resident")}</option>
            <option value="physician">{t("common.levels.physician")}</option>
          </select>
        </div>
        <div>
          <Label>{t("profile.form.country")}</Label>
          <Input value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))} className="mt-1" maxLength={60} placeholder={t("profile.form.countryPlaceholder")} />
        </div>
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("profile.form.save")}
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label={t("profile.stats.consultations")} value={data?.total ?? 0} />
        <Stat label={t("profile.stats.totalScore")} value={data?.profile?.total_score ?? 0} />
        <Stat label={t("profile.stats.kymiaGold")} value={wins?.kymia_gold_count ?? 0} />
      </div>

      <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <h2 className="flex items-center gap-2 font-serif text-2xl">
          <Trophy className="h-5 w-5 text-gold" /> {t("profile.goldHistory.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("profile.goldHistory.description")}
        </p>
        <ul className="mt-4 divide-y">
          {(wins?.wins ?? []).map((w) => (
            <li key={w.session_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>🥇 <strong>{w.week_label}</strong> — {w.specialty ?? t("profile.goldHistory.specialtyFallback")}</span>
              <span className="text-xs text-muted-foreground">{new Date(w.won_at).toLocaleDateString(dateLocale)}</span>
            </li>
          ))}
          {(!wins?.wins || wins.wins.length === 0) && (
            <li className="py-6 text-center text-sm text-muted-foreground">{t("profile.goldHistory.empty")}</li>
          )}
        </ul>
      </section>

      <LanguageSettings />
    </div>
  );
}


function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl text-primary">{value}</p>
    </div>
  );
}
