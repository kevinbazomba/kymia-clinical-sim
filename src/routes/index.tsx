import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Brain, Stethoscope, BookOpen, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";

const headT = makeT(getStoredLang());

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: headT("landing.head.title") },
      { name: "description", content: headT("landing.head.description") },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();

  const features = [
    { icon: Stethoscope, title: t("landing.features.realPatients.title"), desc: t("landing.features.realPatients.desc") },
    { icon: Brain, title: t("landing.features.reasoning.title"), desc: t("landing.features.reasoning.desc") },
    { icon: BookOpen, title: t("landing.features.feedback.title"), desc: t("landing.features.feedback.desc") },
    { icon: Trophy, title: t("landing.features.leaderboard.title"), desc: t("landing.features.leaderboard.desc") },
    { icon: ShieldCheck, title: t("landing.features.privacy.title"), desc: t("landing.features.privacy.desc") },
    { icon: Activity, title: t("landing.features.specialties.title"), desc: t("landing.features.specialties.desc") },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10 bg-[image:var(--gradient-hero)]" />

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="font-serif text-2xl font-semibold tracking-tight">Kymia</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <Link to="/auth" search={{ mode: "signin" }}>
            <Button variant="ghost" size="sm">{t("landing.nav.signIn")}</Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="sm" className="shadow-[var(--shadow-soft)]">{t("landing.nav.start")}</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {t("landing.hero.badge")}
        </div>
        <h1 className="mt-6 font-serif text-5xl leading-tight text-foreground md:text-7xl">
          {t("landing.hero.titleLine1")}<br />
          <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
            {t("landing.hero.titleLine2")}
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t("landing.hero.description")}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" className="shadow-[var(--shadow-elegant)]">
              {t("landing.hero.ctaSignup")}
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signin" }}>
            <Button size="lg" variant="outline">
              {t("landing.hero.ctaSignin")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elegant)]">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t bg-card/50 py-8 text-center text-sm text-muted-foreground">
        {t("landing.footer", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
