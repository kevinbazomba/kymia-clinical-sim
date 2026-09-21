import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard, getLeaderboard } from "@/lib/consultation.functions";
import { getLastJuryWinner } from "@/lib/jury.functions";
import { SPECIALTIES } from "@/lib/specialties";
import { Button } from "@/components/ui/button";
import { Activity, Trophy, Target, Brain, Sparkles, PlayCircle, Gavel, MessageCircle, Crown, Stethoscope, MessagesSquare, PauseCircle, ClipboardCheck, History, Gavel as JuryIcon } from "lucide-react";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";
import { LanguageHomeBanner } from "@/components/LanguageSwitch";
import frHome from "@/locales/fr/home.json";
import enHome from "@/locales/en/home.json";

const COMMUNITY_URL = "https://chat.whatsapp.com/C269pi8276F8PkR985wzJp?s=cl&p=a&ilr=4";

const GUIDE_STEPS: Record<"fr" | "en", Array<{ title: string; desc: string }>> = {
  fr: frHome.guide.steps,
  en: enHome.guide.steps,
};

const dashboardQuery = (fn: () => Promise<Awaited<ReturnType<typeof getDashboard>>>) =>
  queryOptions({ queryKey: ["dashboard"], queryFn: fn });

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: makeT(getStoredLang())("home.meta.title") }] }),
  component: HomePage,
});

const STEP_ICONS = [Stethoscope, MessagesSquare, PauseCircle, ClipboardCheck, History, JuryIcon];

/** Renders text with **bold** markers as <strong>. */
function Bold({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))}
    </>
  );
}

function HomePage() {
  const { t, lang } = useI18n();
  const dash = useServerFn(getDashboard);
  const lb = useServerFn(getLeaderboard);
  const winnerFn = useServerFn(getLastJuryWinner);
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(dashboardQuery(dash));
  const { data: leaderboard } = useQuery({ queryKey: ["leaderboard"], queryFn: () => lb() });
  const { data: winner } = useQuery({ queryKey: ["jury-winner"], queryFn: () => winnerFn() });
  const steps = GUIDE_STEPS[lang];
  const dateLocale = lang === "en" ? "en-US" : "fr-FR";

  return (
    <div className="space-y-8">
      <LanguageHomeBanner />
      {winner && (
        <section className="relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 p-5 shadow-[var(--shadow-card)] dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-amber-950/30">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gold text-gold-foreground shadow-lg">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">{t("home.winnerBanner.eyebrow")}</p>
                <p className="mt-0.5 font-serif text-xl text-foreground">
                  {winner.display_name}
                  {winner.country ? <span className="ml-2 text-sm text-muted-foreground">· {winner.country}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {winner.specialty ? t("home.winnerBanner.specialtyPrefix", { specialty: winner.specialty }) : ""}
                  {new Date(winner.scheduled_at).toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/jury" })}>
              <Gavel className="mr-2 h-4 w-4" />
              {t("home.winnerBanner.nextJury")}
            </Button>
          </div>
        </section>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-[var(--shadow-card)] md:p-12">
        <div className="absolute inset-0 -z-10 bg-[image:var(--gradient-hero)] opacity-60" />
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-primary">{t("home.hero.welcome")}</p>
            <h1 className="mt-2 font-serif text-4xl text-foreground md:text-5xl">
              {t("home.hero.greeting")}<span className="text-primary">{data.profile?.display_name || t("home.hero.defaultName")}</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              {t("home.hero.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="shadow-[var(--shadow-elegant)]" onClick={() => navigate({ to: "/specialties" })}>
              <PlayCircle className="mr-2 h-5 w-5" />
              {t("home.hero.start")}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate({ to: "/jury" })}>
              <Gavel className="mr-2 h-5 w-5" />
              {t("home.hero.jurySpace")}
            </Button>
            <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-emerald-600 text-white shadow-[var(--shadow-elegant)] hover:bg-emerald-700">
                <MessageCircle className="mr-2 h-5 w-5" />
                {t("home.hero.joinCommunity")}
              </Button>
            </a>
          </div>

        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<Activity className="h-5 w-5" />} label={t("home.stats.consultations")} value={data.total} />
        <StatCard icon={<Target className="h-5 w-5" />} label={t("home.stats.passRate")} value={`${data.pass_rate}%`} />
        <StatCard icon={<Sparkles className="h-5 w-5" />} label={t("home.stats.avgScore")} value={`${data.avg_score}/100`} />
        <StatCard icon={<Trophy className="h-5 w-5" />} label={t("home.stats.totalScore")} value={data.profile?.total_score ?? 0} />
      </section>

      {/* Specialties + Leaderboard */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif text-2xl">{t("home.specialties.title")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {SPECIALTIES.map((s) => (
              <Link
                key={s.id}
                to="/specialties"
                className="group rounded-2xl border bg-card p-4 transition hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground">{s.label}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                    {data.by_specialty[s.id] ?? 0} {t("home.specialties.cases")}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-serif text-2xl">
            <Trophy className="h-5 w-5 text-gold" /> {t("home.leaderboard.title")}
          </h2>
          <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
            {leaderboard && leaderboard.length > 0 ? (
              <ol className="space-y-2">
                {leaderboard.slice(0, 5).map((u, i) => (
                  <li key={u.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/50">
                    <span className="flex items-center gap-3">
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${i < 3 ? "bg-gold text-gold-foreground" : "bg-secondary text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium">{u.display_name || t("home.leaderboard.anonymous")}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{u.total_score} {t("home.leaderboard.points")}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("home.leaderboard.empty")}</p>
            )}
          </div>
        </div>
      </section>


      {/* Mode d'emploi */}
      <section className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl text-foreground">{t("home.guide.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.guide.subtitle")}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, idx) => {
            const Icon = STEP_ICONS[idx];
            return (
              <div key={idx} className="group relative overflow-hidden rounded-2xl border bg-background/50 p-4 transition hover:shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{idx + 1}</span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-3 font-semibold text-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Règles */}
      <section className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-serif text-xl text-foreground">{t("home.rules.title")}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {t.list("home.rules.items").map((item, i) => (
                <li key={i}>• <Bold text={item} /></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 font-serif text-3xl text-foreground">{value}</p>
    </div>
  );
}
