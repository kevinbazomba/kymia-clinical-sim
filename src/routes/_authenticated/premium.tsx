import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { checkAdmin } from "@/lib/admin.functions";
import {
  Rocket, Infinity as InfinityIcon, Stethoscope, Sparkles, FileText, ListChecks,
  History, Trophy, Gavel, Award, RefreshCw, CheckCircle2, ArrowLeft,
} from "lucide-react";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";
import frSubscription from "@/locales/fr/subscription.json";
import enSubscription from "@/locales/en/subscription.json";

export const Route = createFileRoute("/_authenticated/premium")({
  head: () => {
    const t = makeT(getStoredLang());
    return {
      meta: [
        { title: t("subscription.meta.title") },
        { name: "description", content: t("subscription.meta.description") },
      ],
    };
  },
  component: PremiumPage,
});

const BENEFIT_ICONS = [
  InfinityIcon, Stethoscope, Sparkles, FileText, FileText,
  History, Trophy, Gavel, Award, RefreshCw,
];

const BENEFITS_TEXT: Record<"fr" | "en", string[]> = {
  fr: frSubscription.benefits.items,
  en: enSubscription.benefits.items,
};

/** Renders text with **bold** markers as <strong>. */
function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))}
    </>
  );
}

function useEmail() {
  const { data } = useQuery({
    queryKey: ["session-email"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.email ?? "",
    staleTime: 60_000,
  });
  return data ?? "";
}

function PremiumPage() {
  const { t, lang } = useI18n();
  const email = useEmail();
  const message = t("subscription.whatsappMessage", { email: email || "____________" });
  const waHref = `https://wa.me/243990918446?text=${encodeURIComponent(message)}`;
  const benefits = BENEFITS_TEXT[lang];

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <Link to="/home" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("subscription.backHome")}
      </Link>

      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-amber-500/15 via-primary/10 to-background p-8 text-center md:p-12">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/20 text-primary">
          <Rocket className="h-7 w-7" />
        </div>
        <h1 className="mt-4 font-serif text-3xl md:text-5xl">
          {t("subscription.hero.title")}<span className="bg-gradient-to-r from-amber-500 to-primary bg-clip-text text-transparent">{t("subscription.hero.titleHighlight")}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-lg">
          <Bold text={t("subscription.hero.subtitle")} />
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-center font-serif text-2xl">{t("subscription.benefits.title")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {benefits.map((label, i) => {
            const Icon = BENEFIT_ICONS[i];
            return (
              <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-[var(--shadow-soft)]">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm">
                  <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-500" />
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6 text-center shadow-[var(--shadow-elegant)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("subscription.pricing.offer")}</p>
        <div className="mt-2 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
          <div>
            <p className="font-serif text-5xl md:text-6xl">
              5 <span className="text-2xl align-top text-muted-foreground">{t("subscription.pricing.currency")}</span>
              <span className="text-base font-normal text-muted-foreground">{t("subscription.pricing.perMonth")}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("subscription.pricing.monthlyNote")}</p>
          </div>
          <div>
            <p className="font-serif text-5xl md:text-6xl">
              55 <span className="text-2xl align-top text-muted-foreground">{t("subscription.pricing.currency")}</span>
              <span className="text-base font-normal text-muted-foreground">{t("subscription.pricing.perYear")}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("subscription.pricing.annualNote")}</p>
          </div>
        </div>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {t("subscription.pricing.description")}
        </p>

        <a href={waHref} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block">
          <Button size="lg" className="h-14 rounded-full bg-emerald-600 px-8 text-base font-semibold shadow-lg hover:bg-emerald-700">
            {t("subscription.pricing.subscribe")}
          </Button>
        </a>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {t("subscription.pricing.note")}
        </p>
      </section>

      <AdminSkipNotice />
    </div>
  );
}

function AdminSkipNotice() {
  const { t } = useI18n();
  const check = useServerFn(checkAdmin);
  const { data } = useQuery({ queryKey: ["is-admin-premium"], queryFn: () => check(), staleTime: 5 * 60_000 });
  if (!data?.isAdmin) return null;
  return (
    <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
      {t("subscription.adminNotice")}
    </p>
  );
}
