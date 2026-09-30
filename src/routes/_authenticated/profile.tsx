import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard, updateProfile } from "@/lib/consultation.functions";
import { getMyJuryWins } from "@/lib/jury.functions";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2, Moon, Palette, Sun, Trophy, MessageCircle, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";
import { LanguageSettings } from "@/components/LanguageSwitch";
import { useTheme, type AppTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: makeT(getStoredLang())("profile.meta.title") }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang } = useI18n();
  const { theme, setTheme } = useTheme();
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
        <p className="mt-1 text-muted-foreground">{t("profile.header.subtitle")}</p>
        {data?.profile?.display_name && (
          <p className="mt-3 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-foreground">
            {data.profile.display_name}
          </p>
        )}
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

      <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div>
          <h2 className="font-serif text-2xl">{t("profile.theme.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("profile.theme.description")}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("profile.theme.title")}>
          {([
            { id: "white", title: t("profile.theme.whiteTitle"), description: t("profile.theme.whiteDescription"), Icon: Sun, swatches: ["bg-stone-50", "bg-white", "bg-teal-800"] },
            { id: "dark", title: t("profile.theme.darkTitle"), description: t("profile.theme.darkDescription"), Icon: Moon, swatches: ["bg-zinc-950", "bg-zinc-800", "bg-teal-300"] },
            { id: "mboa", title: t("profile.theme.mboaTitle"), description: t("profile.theme.mboaDescription"), Icon: Palette, swatches: ["bg-amber-100", "bg-orange-800", "bg-green-800"] },
          ] as const).map(({ id, title, description, Icon, swatches }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={theme === id}
              onClick={() => setTheme(id as AppTheme)}
              className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${theme === id ? "border-primary bg-primary/5 shadow-[var(--shadow-soft)]" : "hover:bg-muted/60"}`}
            >
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-primary"><Icon className="h-4 w-4" /></span>
                <span className="flex gap-1" aria-hidden="true">{swatches.map((color) => <i key={color} className={`h-3 w-3 rounded-full ${color}`} />)}</span>
              </div>
              <span className="mt-3 block font-semibold text-foreground">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label={t("profile.stats.consultations")} value={data?.total ?? 0} />
        <Stat label={t("profile.stats.totalScore")} value={data?.profile?.total_score ?? 0} />
        <Stat label={t("profile.stats.kymiaGold")} value={wins?.kymia_gold_count ?? 0} />
      </div>

      <SubscriptionCard subscription={data?.subscription} locale={dateLocale} />

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

function SubscriptionCard({
  subscription, locale,
}: {
  subscription: {
    status: string | null; plan: string | null; starts_at: string | null; expires_at: string | null;
    active: boolean; days_remaining: number; is_expiring_soon: boolean;
  } | null | undefined;
  locale: string;
}) {
  const status = subscription?.status === "free" ? "Gratuit"
    : subscription?.status === "active" ? "Premium"
      : subscription?.status === "suspended" ? "Suspendu"
        : subscription ? "Expiré" : "Gratuit";
  const format = (date: string | null | undefined) => date
    ? new Date(date).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" }) : "—";
  const totalDays = subscription?.starts_at && subscription?.expires_at
    ? Math.max(1, Math.ceil((new Date(subscription.expires_at).getTime() - new Date(subscription.starts_at).getTime()) / 86_400_000)) : 0;
  const progress = subscription?.active && totalDays ? Math.min(100, Math.round((subscription.days_remaining / totalDays) * 100)) : 0;
  const renewalMessage = "Bonjour, je souhaite renouveler mon abonnement avant son expiration afin de bénéficier des 7 jours offerts. Mon adresse Kymia est : [à compléter].";
  const renewalUrl = `https://wa.me/243990918446?text=${encodeURIComponent(renewalMessage)}`;

  return (
    <section className={`rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)] ${subscription?.is_expiring_soon ? "border-amber-400/60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-2xl"><Crown className="h-5 w-5 text-primary" /> Mon abonnement</h2>
          <p className="mt-1 text-sm text-muted-foreground">Vos informations d’accès Kymia.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${subscription?.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{status}</span>
      </div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <Info label="Début" value={format(subscription?.starts_at)} />
        <Info label="Expiration" value={format(subscription?.expires_at)} />
        <Info label="Jours restants" value={subscription?.active ? `${subscription.days_remaining} jour${subscription.days_remaining !== 1 ? "s" : ""}` : "—"} />
        <Info label="Type / durée" value={subscription?.plan || "—"} />
      </div>
      {subscription?.active && totalDays > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>Progression de l’abonnement</span><span>{subscription.days_remaining} jour{subscription.days_remaining !== 1 ? "s" : ""} restant{subscription.days_remaining !== 1 ? "s" : ""}</span></div>
          <Progress value={progress} className={subscription.is_expiring_soon ? "[&>div]:bg-amber-500" : ""} />
        </div>
      )}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-amber-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600"><Gift className="h-5 w-5" /></span>
          <div>
            <h3 className="font-semibold text-foreground">Renouvelez à l’avance et profitez de 7 jours offerts</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">En renouvelant votre abonnement avant son expiration, vous bénéficiez de 7 jours supplémentaires, ajoutés à votre période actuelle.</p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border bg-background/70">
          <div className="grid grid-cols-2 bg-secondary/60 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span>Forfait</span><span className="text-right">Tarif</span></div>
          {[{ plan: "1 mois", price: "2 900 FCFA / 5 $" }, { plan: "3 mois", price: "7 600 FCFA / 13 $" }, { plan: "1 an", price: "32 000 FCFA / 55 $" }].map((item) => <div key={item.plan} className="grid grid-cols-2 items-center border-t px-3 py-2.5 text-sm"><span className="font-medium">{item.plan}</span><span className="text-right font-semibold text-primary">{item.price}</span></div>)}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Pour prolonger votre abonnement, écrivez-nous sur WhatsApp :</p>
        <a href={renewalUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex">
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700"><MessageCircle className="mr-2 h-4 w-4" />Je Prolonge</Button>
        </a>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-secondary/50 p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium text-foreground">{value}</p></div>;
}


function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl text-primary">{value}</p>
    </div>
  );
}
