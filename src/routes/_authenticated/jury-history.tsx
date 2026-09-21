import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyJurySubmissions, getMyJurySubmission } from "@/lib/jury.functions";
import { useState } from "react";
import { Loader2, ArrowLeft, Printer, ScrollText, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/jury-history")({
  head: () => ({ meta: [{ title: makeT(getStoredLang())("jury.meta.titleHistory") }] }),
  component: JuryHistoryPage,
});

function JuryHistoryPage() {
  const { t, lang } = useI18n();
  const listFn = useServerFn(listMyJurySubmissions);
  const detailFn = useServerFn(getMyJurySubmission);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: list, isLoading } = useQuery({ queryKey: ["my-jury"], queryFn: () => listFn() });
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["my-jury-detail", openId],
    queryFn: () => detailFn({ data: { submission_id: openId! } }),
    enabled: !!openId,
  });

  if (openId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t("jury.history.back")}
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> {t("jury.history.downloadPdf")}
          </Button>
        </div>
        {detailLoading || !detail ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        ) : (
          <JuryCorrection detail={detail} t={t} lang={lang} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
          <ScrollText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-serif text-3xl">{t("jury.history.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("jury.history.subtitle")}</p>
        </div>
      </header>

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : (list ?? []).length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("jury.history.empty")} <Link to="/jury" className="text-primary underline">{t("jury.history.seeNextSession")}</Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full text-sm">
            <thead className="border-b bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">{t("jury.history.colDate")}</th>
                <th className="px-4 py-3 text-left">{t("jury.history.colSpecialty")}</th>
                <th className="px-4 py-3 text-right">{t("jury.history.colScore")}</th>
                <th className="px-4 py-3 text-right">{t("jury.history.colStatus")}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(list ?? []).map((r) => (
                <tr key={r.submission_id} className="border-b last:border-0 hover:bg-secondary/30">
                  <td className="px-4 py-3">
                    {r.scheduled_at ? new Date(r.scheduled_at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">{r.specialty ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-primary">{r.score}/100</td>
                  <td className="px-4 py-3 text-right">
                    {r.won ? <span className="inline-flex items-center gap-1 text-gold"><Trophy className="h-4 w-4" />{t("jury.history.winner")}</span> : <span className="text-muted-foreground">{t("jury.history.participant")}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setOpenId(r.submission_id)}>{t("jury.history.view")}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function JuryCorrection({ detail, t, lang }: { detail: any; t: ReturnType<typeof useI18n>["t"]; lang: string }) {
  const sub = detail.submission;
  const session = detail.session;
  const report = sub.report ?? {};
  const diag = sub.diagnosis ?? {};
  const caseData = session?.case_data ?? {};

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) =>
    <section className="rounded-xl border bg-card p-5 print:border-0 print:p-2 print:shadow-none">
      <h3 className="font-serif text-lg text-primary">{title}</h3>
      <div className="mt-2 text-sm whitespace-pre-wrap text-foreground">{children}</div>
    </section>;

  const List = ({ items }: { items?: string[] }) =>
    !items || items.length === 0 ? <em className="text-muted-foreground">—</em> :
      <ul className="ml-5 list-disc space-y-1">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;

  return (
    <article className="mx-auto max-w-3xl space-y-4 print:max-w-none">
      <header className="rounded-xl border-2 border-primary/30 bg-card p-6 text-center print:border-0">
        <p className="text-xs uppercase tracking-wider text-primary">{t("jury.correction.eyebrow")}</p>
        <h1 className="mt-1 font-serif text-3xl">{session?.specialty ?? t("jury.correction.sessionFallback")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {session?.scheduled_at && new Date(session.scheduled_at).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <p className="mt-4 font-serif text-5xl text-primary">{sub.score}/100</p>
        <p className="text-xs text-muted-foreground">{t("jury.correction.globalScore")}</p>
      </header>

      <Section title={t("jury.correction.clinicalCase")}>{caseData.clinical_scenario ?? "—"}</Section>

      <Section title={t("jury.correction.myAnswer")}>
        <p><strong>{t("jury.correction.mainDiagnosis")}</strong> {diag.main}</p>
        <p className="mt-2"><strong>{t("jury.correction.arguments")}</strong> {diag.arguments_for}</p>
        <p className="mt-2"><strong>{t("jury.correction.differentials")}</strong> {diag.differentials}</p>
        <p className="mt-2"><strong>{t("jury.correction.confirmationExams")}</strong> {diag.confirmation_exams}</p>
        <p className="mt-2"><strong>{t("jury.correction.extensionExams")}</strong> {diag.extension_exams}</p>
        <p className="mt-2"><strong>{t("jury.correction.management")}</strong> {diag.management}</p>
      </Section>

      <Section title={t("jury.correction.answerAnalysis")}>{report.answer_analysis ?? "—"}</Section>
      <Section title={t("jury.correction.correctPoints")}><List items={report.correct_points} /></Section>
      <Section title={t("jury.correction.errors")}><List items={report.errors ?? report.weaknesses} /></Section>
      <Section title={t("jury.correction.unnecessaryExams")}><List items={report.unnecessary_exams} /></Section>
      <Section title={t("jury.correction.missedExams")}><List items={report.missed_exams} /></Section>
      <Section title={t("jury.correction.expectedApproach")}>{report.expected_approach ?? "—"}</Section>
      <Section title={t("jury.correction.finalDiagnosis")}>{report.final_diagnosis ?? "—"}</Section>
      <Section title={t("jury.correction.differentialsSection")}>{report.differentials ?? "—"}</Section>
      <Section title={t("jury.correction.confirmationExamsSection")}>{report.confirmation_exams ?? "—"}</Section>
      <Section title={t("jury.correction.extensionExamsSection")}>{report.extension_exams ?? "—"}</Section>
      <Section title={t("jury.correction.managementSection")}>{report.management ?? "—"}</Section>
      <Section title={t("jury.correction.pathophysiology")}>{report.pathophysiology ?? "—"}</Section>
      <Section title={t("jury.correction.semiology")}>{report.semiology ?? "—"}</Section>
      <Section title={t("jury.correction.references")}><List items={report.references} /></Section>
      <Section title={t("jury.correction.expertAnswer")}>{report.expert_answer ?? "—"}</Section>
    </article>
  );
}
