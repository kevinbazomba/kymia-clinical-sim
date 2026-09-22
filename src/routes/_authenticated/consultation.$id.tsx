import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getConsultation, sendPatientMessage, requestExam,
  pauseConsultation, submitDiagnosis, askMentor,
} from "@/lib/consultation.functions";
import { EXAM_CATEGORIES, getSpecialty, specialtyLabel, examPresetLabel } from "@/lib/specialties";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Send, Loader2, FlaskConical, ScanLine, Activity as ActivityIcon, Pause,
  User as UserIcon, Stethoscope, GraduationCap, Sparkles, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ExamResultsPanel } from "@/components/ExamResultsPanel";
import { useI18n, makeT, getStoredLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/consultation/$id")({
  head: () => {
    const t = makeT(getStoredLang());
    return { meta: [{ title: `${t("consultation.page.title")} — Kymia` }] };
  },
  component: ConsultationPage,
});

interface MsgT { role: "user" | "assistant"; content: string; ts: number; }

const CORRECTION_LOADING_MESSAGES = [
  "Analyse de votre consultation…",
  "Évaluation de votre raisonnement clinique…",
  "Vérification des éléments recherchés…",
  "Analyse des examens demandés…",
  "Identification des points à améliorer…",
  "Préparation de votre correction personnalisée…",
  "Encore un instant… Kymia Motcho prépare votre correction. 🩺",
];

function ConsultationPage() {
  const { t, lang } = useI18n();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getC = useServerFn(getConsultation);
  const sendMsg = useServerFn(sendPatientMessage);
  const reqExam = useServerFn(requestExam);
  const pause = useServerFn(pauseConsultation);
  const submit = useServerFn(submitDiagnosis);

  const { data, isLoading } = useQuery({
    queryKey: ["consultation", id],
    queryFn: () => getC({ data: { id } }),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [submittedDiagnosis, setSubmittedDiagnosis] = useState<DiagT | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [correctionReady, setCorrectionReady] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.messages]);

  const sendMut = useMutation({
    mutationFn: async (message: string) => sendMsg({ data: { id, message } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consultation", id] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("consultation.errors.generic")),
  });

  const examMut = useMutation({
    mutationFn: async (v: { category: "physical" | "biology" | "imaging" | "custom"; name: string }) =>
      reqExam({ data: { id, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consultation", id] });
      toast.success(t("consultation.page.investigations.resultReady"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("consultation.errors.generic")),
  });

  type DiagT = { main: string; differentials: string; arguments_for: string; arguments_against: string; exams_supporting: string; management: string };
  const submitMut = useMutation({
    mutationFn: async (diag: DiagT) => submit({ data: { id, diagnosis: diag } }),
    onSuccess: () => {
      setCorrectionReady(true);
      window.setTimeout(() => navigate({ to: "/report/$id", params: { id } }), 700);
    },
    onError: (e) => setSubmissionError(e instanceof Error ? e.message : t("consultation.errors.generic")),
  });

  useEffect(() => {
    if (!submitMut.isPending) return;
    setLoadingMessageIndex(0);
    const interval = window.setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % CORRECTION_LOADING_MESSAGES.length);
    }, 3500);
    return () => window.clearInterval(interval);
  }, [submitMut.isPending]);

  function startSubmission(diagnosis: DiagT) {
    if (submitMut.isPending || correctionReady) return;
    setSubmittedDiagnosis(diagnosis);
    setSubmissionError(null);
    submitMut.mutate(diagnosis);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sendMut.isPending) return;
    const text = input.trim();
    setInput("");
    sendMut.mutate(text);
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caseData: any = data.case_data;
  const messages = (data.messages as unknown as MsgT[]) ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exams = (data.exams as Record<string, any[]>) ?? {};
  const spec = getSpecialty(data.specialty as string);
  const isCompleted = data.status === "completed";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cycle: string = (data as any).cycle ?? "second";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mentorMessages = ((data as any).mentor_messages as MsgT[]) ?? [];
  const isPremier = cycle === "premier";

  return (
    <>
      <CorrectionLoadingOverlay
        active={submitMut.isPending}
        ready={correctionReady}
        error={submissionError}
        message={CORRECTION_LOADING_MESSAGES[loadingMessageIndex]}
        onRetry={() => submittedDiagnosis && startSubmission(submittedDiagnosis)}
        onReturn={() => setSubmissionError(null)}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Chat panel */}
      <section className="flex flex-col rounded-2xl border bg-card shadow-[var(--shadow-card)] min-h-[70vh]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
              <UserIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {caseData?.patient?.name ?? t("consultation.page.patientFallback")} · {caseData?.patient?.sex} {caseData?.patient?.age} {t("common.labels.years")}
              </p>
              <p className="text-xs text-muted-foreground">{spec ? specialtyLabel(spec.id, lang) : ""} · {t("consultation.page.motif")} : {caseData?.chief_complaint}</p>
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            {!isCompleted && (
              <Button variant="outline" size="sm" onClick={async () => { await pause({ data: { id } }); toast.success(t("consultation.page.paused")); navigate({ to: "/history" }); }}>
                <Pause className="mr-1 h-4 w-4" /> {t("consultation.page.pause")}
              </Button>
            )}
            <DiagnosisDialog disabled={isCompleted || submitMut.isPending} onSubmit={startSubmission} loading={submitMut.isPending} />
          </div>
        </header>

        <ScrollArea className="flex-1" ref={scrollRef as never}>
          <div className="space-y-4 p-5">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">{t("consultation.page.startPrompt")}</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-[var(--shadow-soft)] ${
                  m.role === "user" ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "bg-secondary text-foreground"
                }`}>
                  <p className="text-[10px] font-semibold uppercase opacity-60">{m.role === "user" ? t("consultation.page.you") : t("consultation.page.patient")}</p>
                  <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {sendMut.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 animate-spin" /> {t("consultation.page.patientThinking")}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {!isCompleted && (
          <form onSubmit={handleSend} className="border-t p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("consultation.page.inputPlaceholder")}
                disabled={sendMut.isPending}
                autoFocus
              />
              <Button type="submit" disabled={!input.trim() || sendMut.isPending}>
                {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Side: exams */}
      <aside className="space-y-3">
        <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
          <h3 className="font-serif text-lg">{t("consultation.page.investigations.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("consultation.page.investigations.subtitle")}</p>

          <Tabs defaultValue="physical" className="mt-3">
            <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
              <TabsTrigger value="physical"><Stethoscope className="mr-1 h-3 w-3" />{t("consultation.page.investigations.tabClinical")}</TabsTrigger>
              <TabsTrigger value="biology"><FlaskConical className="mr-1 h-3 w-3" />{t("consultation.page.investigations.tabBiology")}</TabsTrigger>
              <TabsTrigger value="imaging"><ScanLine className="mr-1 h-3 w-3" />{t("consultation.page.investigations.tabImaging")}</TabsTrigger>
            </TabsList>
            {(["physical", "biology", "imaging"] as const).map((cat) => (
              <TabsContent key={cat} value={cat} className="mt-3">
                <ScrollArea className="h-[220px]">
                  <div className="space-y-1">
                    {EXAM_CATEGORIES[cat].items.map((name) => {
                      const done = exams[cat]?.find((e) => e.name === name);
                      const loading = examMut.isPending && examMut.variables?.name === name;
                      return (
                        <button
                          key={name}
                          disabled={isCompleted || examMut.isPending}
                          onClick={() => !done && examMut.mutate({ category: cat, name })}
                          className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-secondary ${done ? "text-success" : "text-foreground"} disabled:opacity-50`}
                        >
                          <span>{examPresetLabel(cat, name, lang)}</span>
                          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : done ? "✓" : null}
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>

          <CustomExamSearch disabled={isCompleted || examMut.isPending} onSubmit={(name) => examMut.mutate({ category: "custom", name })} />
        </div>

        {/* Results log — always visible, scrollable, grouped by category */}
        <ExamResultsPanel exams={exams} height={isPremier ? "260px" : "480px"} />

        {isPremier && (
          <MentorPanel
            consultationId={id}
            messages={mentorMessages}
            disabled={isCompleted}
          />
        )}

        {isCompleted && (
          <Link to="/report/$id" params={{ id }} className="block">
            <Button variant="outline" className="w-full">{t("consultation.page.seeReport")}</Button>
          </Link>
        )}
      </aside>
      </div>
    </>
  );
}

function CorrectionLoadingOverlay({
  active, ready, error, message, onRetry, onReturn,
}: {
  active: boolean;
  ready: boolean;
  error: string | null;
  message: string;
  onRetry: () => void;
  onReturn: () => void;
}) {
  if (!active && !ready && !error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-live="polite">
      <section className="w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 bg-card p-7 text-center shadow-2xl sm:p-9">
        {error ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="mt-5 font-serif text-2xl">Nous n’avons pas pu générer votre correction pour le moment.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Votre consultation n’a pas été perdue. Vous pouvez réessayer en conservant toutes vos réponses.
            </p>
            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              <Button onClick={onRetry}>Réessayer</Button>
              <Button variant="outline" onClick={onReturn}>Retour à ma consultation</Button>
            </div>
          </>
        ) : ready ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-lg animate-pulse">
              <Stethoscope className="h-8 w-8" />
            </div>
            <h2 className="mt-5 font-serif text-2xl">Correction prête ! 🎉</h2>
            <p className="mt-3 text-sm text-muted-foreground">Ouverture de votre correction personnalisée…</p>
          </>
        ) : (
          <>
            <div className="relative mx-auto grid h-24 w-24 place-items-center">
              <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-primary/60" />
              <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary animate-pulse">
                <Stethoscope className="h-8 w-8" />
              </div>
            </div>
            <h2 className="mt-6 font-serif text-2xl sm:text-3xl">🩺 Analyse de votre consultation…</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Veuillez patienter pendant que Kymia analyse votre démarche clinique et prépare votre correction personnalisée.
            </p>
            <p className="mt-6 min-h-10 text-sm font-medium text-primary transition-opacity duration-500">{message}</p>
            <div className="mx-auto mt-4 flex w-20 justify-center gap-1.5" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MentorPanel({
  consultationId, messages, disabled,
}: { consultationId: string; messages: MsgT[]; disabled: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const ask = useServerFn(askMentor);
  const [question, setQuestion] = useState("");
  const mut = useMutation({
    mutationFn: (q?: string) => ask({ data: { id: consultationId, question: q } }),
    onSuccess: () => { setQuestion(""); qc.invalidateQueries({ queryKey: ["consultation", consultationId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("consultation.errors.generic")),
  });

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div>
          <p className="font-serif text-base">{t("consultation.page.mentor.name")}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("consultation.page.mentor.subtitle")}</p>
        </div>
      </div>

      <ScrollArea className="mt-3 h-[220px] rounded-lg border bg-secondary/30 p-3">
        <div className="space-y-3">
          {messages.length === 0 && <p className="text-xs text-muted-foreground">{t("consultation.page.mentor.empty")}</p>}
          {messages.map((m, i) => (
            <div key={i} className={`text-xs ${m.role === "assistant" ? "text-foreground" : "text-primary"}`}>
              <p className="font-semibold">{m.role === "assistant" ? t("consultation.page.mentor.name") : t("consultation.page.mentor.you")}</p>
              <p className="mt-0.5 whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          ))}
          {mut.isPending && <p className="text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin" /> {t("consultation.page.mentor.thinking")}</p>}
        </div>
      </ScrollArea>

      {!disabled && (
        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate(question.trim() || undefined); }}
          className="mt-3 space-y-2"
        >
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("consultation.page.mentor.questionPlaceholder")}
            rows={2}
            className="text-xs"
            disabled={mut.isPending}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1" disabled={mut.isPending}
              onClick={() => mut.mutate(undefined)}>
              <Sparkles className="mr-1 h-3 w-3" /> {t("consultation.page.mentor.askAdvice")}
            </Button>
            <Button type="submit" size="sm" disabled={mut.isPending || !question.trim()}>
              {t("consultation.page.mentor.send")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function CustomExamSearch({ disabled, onSubmit }: { disabled: boolean; onSubmit: (name: string) => void }) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const v = value.trim();
        if (!v) return;
        onSubmit(v);
        setValue("");
      }}
      className="mt-3 border-t pt-3"
    >
      <Label className="text-xs text-muted-foreground">{t("consultation.page.investigations.customSearchLabel")}</Label>
      <div className="mt-1 flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("consultation.page.investigations.customSearchPlaceholder")}
          disabled={disabled}
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" disabled={disabled || !value.trim()}>
          {t("consultation.page.investigations.customSearchButton")}
        </Button>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{t("consultation.page.investigations.customSearchHelp")}</p>
    </form>
  );
}


function DiagnosisDialog({
  disabled, onSubmit, loading,
}: {
  disabled: boolean;
  onSubmit: (d: { main: string; differentials: string; arguments_for: string; arguments_against: string; exams_supporting: string; management: string }) => void;
  loading: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    main: "", differentials: "", arguments_for: "", arguments_against: "", exams_supporting: "", management: "",
  });

  const fields = [
    { k: "main", label: t("consultation.page.diagnosisDialog.mainLabel"), placeholder: t("consultation.page.diagnosisDialog.mainPlaceholder") },
    { k: "differentials", label: t("consultation.page.diagnosisDialog.differentialsLabel"), placeholder: t("consultation.page.diagnosisDialog.differentialsPlaceholder") },
    { k: "arguments_for", label: t("consultation.page.diagnosisDialog.argumentsForLabel") },
    { k: "arguments_against", label: t("consultation.page.diagnosisDialog.argumentsAgainstLabel") },
    { k: "exams_supporting", label: t("consultation.page.diagnosisDialog.examsSupportingLabel") },
    { k: "management", label: t("consultation.page.diagnosisDialog.managementLabel") },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={disabled}>
          <ActivityIcon className="mr-1 h-4 w-4" />{t("consultation.page.diagnoseButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">{t("consultation.page.diagnosisDialog.title")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.main.trim()) return toast.error(t("consultation.page.diagnosisDialog.mainRequired"));
            onSubmit(form);
            setOpen(false);
          }}
          className="space-y-4"
        >
          {fields.map((f) => (
            <div key={f.k}>
              <Label>{f.label}</Label>
              {f.k === "main" ? (
                <Input
                  value={form[f.k as keyof typeof form]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.k]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="mt-1"
                />
              ) : (
                <Textarea
                  value={form[f.k as keyof typeof form]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.k]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="mt-1"
                  rows={3}
                />
              )}
            </div>
          ))}
          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("consultation.page.diagnosisDialog.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
