import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listConsultations } from "@/lib/consultation.functions";
import { getSpecialty, specialtyLabel } from "@/lib/specialties";
import { Loader2, CheckCircle2, PauseCircle, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => {
    const t = makeT(getStoredLang());
    return { meta: [{ title: `${t("consultation.history.title")} — Kymia` }] };
  },
  component: HistoryPage,
});

function HistoryPage() {
  const { t, lang } = useI18n();
  const fn = useServerFn(listConsultations);
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">{t("consultation.history.title")}</h1>
        <p className="text-muted-foreground">{t("consultation.history.subtitle")}</p>
      </header>

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">{t("consultation.history.empty")}</p>
          <Link to="/specialties" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            {t("consultation.history.cta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((c) => {
            const spec = getSpecialty(c.specialty);
            const target = c.status === "completed" ? "/report/$id" : "/consultation/$id";
            return (
              <Link
                key={c.id}
                to={target}
                params={{ id: c.id }}
                className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex items-center gap-3 sm:gap-4">
                  <StatusIcon status={c.status} />
                  <div>
                    <p className="font-semibold text-foreground">{spec ? specialtyLabel(spec.id, lang) : c.specialty}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.patient_label} · {c.chief_complaint}
                    </p>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                  {c.score != null && <Badge variant="secondary">{c.score}/100</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString(lang === "en" ? "en-US" : "fr-FR")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="h-5 w-5 text-success" />;
  if (status === "paused") return <PauseCircle className="h-5 w-5 text-warning" />;
  return <Circle className="h-5 w-5 text-primary" />;
}
