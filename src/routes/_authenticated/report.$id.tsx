import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConsultation } from "@/lib/consultation.functions";
import { getSpecialty } from "@/lib/specialties";
import { Loader2, Trophy, BookOpen, AlertTriangle, CheckCircle2, XCircle, Lightbulb, GraduationCap, Sparkles, Download, Library } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/report/$id")({
  head: () => ({ meta: [{ title: "Rapport pédagogique — Kymia" }] }),
  component: ReportPage,
});

interface BeginnerSummary {
  good_questions: string[];
  forgotten_questions: string[];
  reasoning_errors: string[];
  good_exams: string[];
  useless_exams: string[];
  semiology_to_review: string[];
  acquired_skills: string[];
  davy_encouragement: string;
  next_objectives: string[];
}

interface ReportT {
  score: number;
  diagnostic_accuracy: number;
  interrogation_quality: number;
  exam_quality: number;
  exam_relevance: number;
  reasoning_speed: number;
  strengths: string[];
  weaknesses: string[];
  missed_questions: string[];
  missed_exams: string[];
  unnecessary_exams: string[];
  expert_approach: string;
  full_explanation: string;
  pathophysiology: string;
  advice: string;
  reference_course?: string | null;
  beginner_summary?: BeginnerSummary | null;
}


function ReportPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getConsultation);
  const { data, isLoading } = useQuery({ queryKey: ["consultation", id], queryFn: () => fn({ data: { id } }) });

  if (isLoading || !data) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  const r = data.report as unknown as ReportT | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cd: any = data.case_data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diag: any = data.diagnosis;
  const spec = getSpecialty(data.specialty as string);

  if (!r) {
    return <div className="rounded-2xl border bg-card p-8 text-center">
      <p>Rapport indisponible.</p>
      <Link to="/history"><Button variant="link">← Historique</Button></Link>
    </div>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = ((data as any).messages ?? []) as { role: string; content: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exams = ((data as any).exams ?? {}) as Record<string, { name: string; result: string }[]>;

  return (
    <div className="space-y-6 print:space-y-3" id="kymia-report-root">
      <style>{`
        @media print {
          @page { margin: 14mm; }
          body { background: white !important; }
          nav, header.app-nav, .no-print { display: none !important; }
          #kymia-report-root { color: #000; }
          .shadow-\\[var\\(--shadow-card\\)\\], .shadow-\\[var\\(--shadow-soft\\)\\] { box-shadow: none !important; }
          .border { border-color: #ccc !important; }
          .bg-\\[image\\:var\\(--gradient-hero\\)\\], .bg-\\[image\\:var\\(--gradient-primary\\)\\] { background: #f3f4f6 !important; color: #000 !important; }
          section, .rounded-2xl, .rounded-3xl, .rounded-xl { break-inside: avoid; page-break-inside: avoid; }
          h1, h2, h3 { break-after: avoid; }
        }
      `}</style>

      <header className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="absolute inset-0 -z-10 bg-[image:var(--gradient-hero)] opacity-60 print:hidden" />
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary">{spec?.label}</p>
            <h1 className="mt-2 font-serif text-4xl">Rapport pédagogique</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Diagnostic réel : <strong className="text-foreground">{cd?.hidden_diagnosis ?? "—"}</strong>
            </p>
            <p className="text-sm text-muted-foreground">Votre diagnostic : <span className="text-foreground">{diag?.main}</span></p>
          </div>
          <div className="text-center">
            <Trophy className="mx-auto h-8 w-8 text-gold" />
            <p className="mt-2 font-serif text-6xl text-primary">{r.score}<span className="text-2xl text-muted-foreground">/100</span></p>
            <Button size="sm" variant="outline" className="mt-3 no-print" onClick={() => window.print()}>
              <Download className="mr-1 h-4 w-4" /> Télécharger PDF
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-5">
        {[
          { l: "Diagnostic", v: r.diagnostic_accuracy },
          { l: "Interrogatoire", v: r.interrogation_quality },
          { l: "Examen clinique", v: r.exam_quality },
          { l: "Pertinence examens", v: r.exam_relevance },
          { l: "Raisonnement", v: r.reasoning_speed },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border bg-card p-4 shadow-[var(--shadow-soft)]">
            <p className="text-xs font-medium text-muted-foreground">{s.l}</p>
            <p className="mt-1 font-serif text-2xl text-primary">{s.v}</p>
            <Progress value={s.v} className="mt-2" />
          </div>
        ))}
      </section>

      {cd && (
        <Block icon={<BookOpen className="h-5 w-5" />} title="Cas clinique">
          {`Patient : ${cd?.patient?.name ?? ""} · ${cd?.patient?.sex ?? ""} ${cd?.patient?.age ?? ""} ans${cd?.patient?.profession ? " · " + cd.patient.profession : ""}\nMotif : ${cd?.chief_complaint ?? ""}\nDifficulté : ${cd?.difficulty ?? ""}`}
        </Block>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ListCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} title="Points forts" items={r.strengths} />
        <ListCard icon={<AlertTriangle className="h-5 w-5 text-warning" />} title="À améliorer" items={r.weaknesses} />
        <ListCard icon={<XCircle className="h-5 w-5 text-destructive" />} title="Questions oubliées" items={r.missed_questions} />
        <ListCard icon={<XCircle className="h-5 w-5 text-destructive" />} title="Examens manqués" items={r.missed_exams} />
        <ListCard icon={<AlertTriangle className="h-5 w-5 text-warning" />} title="Examens inutiles" items={r.unnecessary_exams} />
        <ListCard icon={<Lightbulb className="h-5 w-5 text-gold" />} title="Conseils personnalisés" items={[r.advice]} />
      </div>

      <Block icon={<BookOpen className="h-5 w-5" />} title="Démarche d'un expert">{r.expert_approach}</Block>
      <Block icon={<BookOpen className="h-5 w-5" />} title="Explication complète du cas">{r.full_explanation}</Block>
      <Block icon={<BookOpen className="h-5 w-5" />} title="Physiopathologie">{r.pathophysiology}</Block>

      {r.beginner_summary && <BeginnerSummarySection s={r.beginner_summary} />}

      {r.reference_course && (
        <section className="rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-[var(--shadow-card)] md:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Library className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-primary">Fiche de révision</p>
              <h2 className="font-serif text-2xl md:text-3xl">Cours de référence — {cd?.hidden_diagnosis}</h2>
            </div>
          </div>
          <article className="prose prose-sm mt-6 max-w-none prose-headings:font-serif prose-headings:text-foreground prose-h2:mt-6 prose-h2:text-primary prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-primary">
            <ReactMarkdown>{r.reference_course}</ReactMarkdown>
          </article>
        </section>
      )}

      {(messages.length > 0 || Object.values(exams).flat().length > 0) && (
        <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h3 className="font-serif text-xl">Détail de la consultation</h3>
          {messages.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold">Interrogatoire</p>
              <div className="mt-2 space-y-1 text-xs text-foreground/80">
                {messages.map((m, i) => (
                  <p key={i}><strong>{m.role === "user" ? "Médecin" : "Patient"} :</strong> {m.content}</p>
                ))}
              </div>
            </div>
          )}
          {Object.values(exams).flat().length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold">Examens et résultats</p>
              <div className="mt-2 space-y-2">
                {Object.entries(exams).flatMap(([cat, list]) =>
                  (list ?? []).map((e, i) => (
                    <div key={`${cat}-${i}`} className="rounded-md bg-secondary/40 p-2 text-xs">
                      <p className="font-semibold">{e.name}</p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{e.result}</p>
                    </div>
                  )),
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="flex gap-3 no-print">
        <Link to="/specialties"><Button>Nouvelle consultation</Button></Link>
        <Link to="/history"><Button variant="outline">Historique</Button></Link>
        <Button variant="outline" onClick={() => window.print()}><Download className="mr-1 h-4 w-4" />Télécharger PDF</Button>
      </div>
    </div>
  );
}

function BeginnerSummarySection({ s }: { s: BeginnerSummary }) {
  return (
    <section className="rounded-3xl border-2 border-primary/30 bg-[image:var(--gradient-hero)] p-6 shadow-[var(--shadow-card)] md:p-8">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-primary">Mode débutant</p>
          <h2 className="font-serif text-2xl md:text-3xl">Bilan pédagogique du débutant</h2>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ListCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} title="Bonnes questions posées" items={s.good_questions} />
        <ListCard icon={<XCircle className="h-5 w-5 text-destructive" />} title="Questions oubliées" items={s.forgotten_questions} />
        <ListCard icon={<AlertTriangle className="h-5 w-5 text-warning" />} title="Erreurs de raisonnement" items={s.reasoning_errors} />
        <ListCard icon={<CheckCircle2 className="h-5 w-5 text-success" />} title="Examens bien choisis" items={s.good_exams} />
        <ListCard icon={<AlertTriangle className="h-5 w-5 text-warning" />} title="Examens inutiles" items={s.useless_exams} />
        <ListCard icon={<BookOpen className="h-5 w-5 text-primary" />} title="Sémiologie à revoir" items={s.semiology_to_review} />
        <ListCard icon={<Sparkles className="h-5 w-5 text-gold" />} title="Compétences acquises" items={s.acquired_skills} />
        <ListCard icon={<Lightbulb className="h-5 w-5 text-primary" />} title="Prochains objectifs" items={s.next_objectives} />
      </div>

      <div className="mt-6 rounded-2xl border border-primary/30 bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <p className="font-serif text-lg">Message du Dr Davy</p>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{s.davy_encouragement}</p>
      </div>
    </section>
  );
}




function ListCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h3 className="flex items-center gap-2 font-semibold">{icon}{title}</h3>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        {items.filter(Boolean).map((it, i) => <li key={i}>• {it}</li>)}
      </ul>
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h3 className="flex items-center gap-2 font-serif text-xl">{icon}{title}</h3>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{children}</p>
    </section>
  );
}
