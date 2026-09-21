import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCurrentJury, startMyJury, saveJuryDraft, juryPatientReply, juryInvestigate,
  finalizeMyJury, getSessionResults,
} from "@/lib/jury.functions";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Gavel, Trophy, Loader2, Clock, ScrollText, History, MessageSquare,
  FlaskConical, Send, Play, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n, makeT } from "@/lib/i18n";
import { getStoredLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/jury")({
  head: () => ({ meta: [{ title: makeT(getStoredLang())("jury.meta.titleMain") }] }),
  component: JuryPage,
});

type Draft = {
  main: string; arguments_for: string; differentials: string;
  confirmation_exams: string; extension_exams: string;
  management: string; surveillance: string; followup: string;
  reasoning_justification: string;
};
const emptyDraft: Draft = {
  main: "", arguments_for: "", differentials: "",
  confirmation_exams: "", extension_exams: "",
  management: "", surveillance: "", followup: "", reasoning_justification: "",
};

function useCountdown(target: string | null | undefined, lang: "fr" | "en" = "fr") {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!target) return { label: "—", ms: 0 };
  const diff = new Date(target).getTime() - now;
  const dU = lang === "en" ? "d" : "j";
  if (diff <= 0) return { label: `0${dU} 0h 0m 0s`, ms: 0 };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { label: d > 0 ? `${d}${dU} ${h}h ${m}m ${s}s` : `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`, ms: diff };
}

function JuryPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const currentFn = useServerFn(getCurrentJury);
  const startFn = useServerFn(startMyJury);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["jury-current"], queryFn: () => currentFn(), refetchInterval: 20000, retry: false,
  });

  useEffect(() => {
    if (!error) return;
    const msg = error instanceof Error ? error.message : "";
    if (msg.includes("FREE_TRIAL_EXHAUSTED") || msg.includes("SUBSCRIPTION_EXPIRED") || msg.includes("SUBSCRIPTION_SUSPENDED")) {
      window.location.href = "/premium";
    }
  }, [error]);

  const [rulesOpen, setRulesOpen] = useState(false);

  const startMut = useMutation({
    mutationFn: () => startFn({ data: { session_id: data!.session.id } }),
    onSuccess: () => { toast.success(t("jury.rules.startToast")); setRulesOpen(false); refetch(); qc.invalidateQueries({ queryKey: ["jury-current"] }); },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : t("jury.errors.generic");
      if (msg.includes("EDITION_CLOSED")) toast.error(t("jury.errors.editionClosed"));
      else if (msg.includes("EDITION_NOT_OPEN")) toast.error(t("jury.errors.editionNotOpen"));
      else if (msg.includes("ACCESS_DENIED")) { window.location.href = "/premium"; }
      else toast.error(msg);
    },
  });

  if (isLoading || !data) {
    if (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("ACCOUNT_SUSPENDED")) {
        return <div className="rounded-2xl border bg-card p-8 text-center text-sm text-destructive">{t("jury.access.accountSuspended")}</div>;
      }
      return <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("jury.access.redirectingPremium")}</div>;
    }
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const opens = useCountdown(data.edition.upcoming ? data.edition.opens_at : null, lang);
  const closes = useCountdown(!data.edition.upcoming ? data.edition.closes_at : null, lang);
  const isOpen = !data.edition.upcoming;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mySub: any = data.my_submission;
  const iStarted = !!mySub;
  const iFinalized = !!mySub?.is_finalized;
  const isCompleted = !!data.session.results_published_at;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="relative overflow-hidden rounded-3xl border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="absolute inset-0 -z-10 bg-[image:var(--gradient-hero)] opacity-60" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground">
            <Gavel className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">{t("jury.header.eyebrow")}</p>
            <h1 className="font-serif text-4xl">{t("jury.header.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("jury.header.subtitle", { edition: data.edition.key.replace("edition-", "") })}
            </p>
          </div>
          <Link to="/jury-history" className="print:hidden">
            <Button variant="outline" size="sm"><History className="mr-2 h-4 w-4" />{t("jury.header.myCorrections")}</Button>
          </Link>
        </div>
      </header>

      {/* STATS */}
      <section className="grid gap-4 md:grid-cols-3">
        {isOpen ? (
          <StatBox icon={<Clock className="h-5 w-5" />} label={t("jury.stats.closesIn")} value={closes.label} />
        ) : (
          <StatBox icon={<Clock className="h-5 w-5" />} label={t("jury.stats.opensIn")} value={opens.label} />
        )}
        <StatBox icon={<ScrollText className="h-5 w-5" />} label={t("jury.stats.specialty")} value={data.session.specialty ?? "—"} />
        <StatBox icon={<Trophy className="h-5 w-5" />} label={t("jury.stats.status")} value={
          isCompleted ? t("jury.stats.published") : isOpen ? t("jury.stats.open") : t("jury.stats.upcoming")
        } />
      </section>

      {/* ÉTAT ACCÈS */}
      {!isOpen && (
        <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-serif text-2xl">{t("jury.access.nextEditionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("jury.access.nextEditionDescription", { time: opens.label })}
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span>{t("jury.access.notifyHint")}</span>
            <NotifyButton />
          </div>
        </section>
      )}

      {isOpen && !iStarted && (
        <section className="rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-serif text-2xl">{t("jury.access.readyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("jury.access.readyDescription")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" onClick={() => setRulesOpen(true)}>
              <Play className="mr-2 h-5 w-5" /> {t("jury.access.startChallenge")}
            </Button>
          </div>
        </section>
      )}

      {iStarted && !iFinalized && (
        <JuryRun
          sessionId={data.session.id}
          caseScenario={String((data.case as { clinical_scenario?: string } | null)?.clinical_scenario ?? "")}
          initialDraft={{
            ...emptyDraft,
            ...(mySub!.draft as Partial<Draft> ?? {}),
            reasoning_justification: (mySub!.reasoning_justification as string) ?? String(((mySub!.draft as Partial<Draft>) ?? {}).reasoning_justification ?? ""),
          }}
          initialTranscript={(mySub!.transcript as Array<{ role: string; text: string; ts: string }>) ?? []}
          initialExams={(mySub!.exams as Array<{ category: string; request: string; result: string; ts: string }>) ?? []}
          deadlineAt={mySub!.deadline_at as string}
          onFinalized={() => refetch()}
        />
      )}

      {iFinalized && (
        <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="flex items-center gap-2 font-serif text-2xl"><Trophy className="h-5 w-5 text-gold" />{t("jury.submitted.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("jury.submitted.personalScore", { score: mySub!.score, auto: mySub!.auto_submitted ? t("jury.submitted.autoSuffix") : "" })}.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isCompleted
              ? t("jury.submitted.resultsAvailable")
              : t("jury.submitted.resultsPending")}
          </p>
          <div className="mt-4">
            <Link to="/jury-history"><Button variant="outline" size="sm"><History className="mr-2 h-4 w-4" />{t("jury.submitted.seeDetail")}</Button></Link>
          </div>
        </section>
      )}

      {isCompleted && <ResultsTable sessionId={data.session.id} />}

      {/* Rules dialog */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">{t("jury.rules.title")}</DialogTitle>
            <DialogDescription>{t("jury.rules.description")}</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
            {t.list("jury.rules.list").map((item, i) => <li key={i}>{item}</li>)}
          </ol>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRulesOpen(false)}>{t("jury.rules.cancel")}</Button>
            <Button onClick={() => startMut.mutate()} disabled={startMut.isPending}>
              {startMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("jury.rules.accept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotifyButton() {
  const { t } = useI18n();
  const [status, setStatus] = useState<string>(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  if (status === "unsupported") return null;
  if (status === "granted") return <span className="ml-auto text-xs text-success">{t("jury.access.notifyActive")}</span>;
  return (
    <Button size="sm" variant="outline" className="ml-auto" onClick={async () => {
      const p = await Notification.requestPermission();
      setStatus(p);
      if (p === "granted") new Notification(t("jury.access.notifyToastTitle"), { body: t("jury.access.notifyToastBody") });
    }}>{t("jury.access.notifyEnable")}</Button>
  );
}

function JuryRun({
  sessionId, caseScenario, initialDraft, initialTranscript, initialExams, deadlineAt, onFinalized,
}: {
  sessionId: string; caseScenario: string; initialDraft: Draft;
  initialTranscript: Array<{ role: string; text: string; ts: string }>;
  initialExams: Array<{ category: string; request: string; result: string; ts: string }>;
  deadlineAt: string; onFinalized: () => void;
}) {
  const { t } = useI18n();
  const saveFn = useServerFn(saveJuryDraft);
  const patientFn = useServerFn(juryPatientReply);
  const investFn = useServerFn(juryInvestigate);
  const finalFn = useServerFn(finalizeMyJury);

  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [exams, setExams] = useState(initialExams);
  const [chatMsg, setChatMsg] = useState("");
  const [examReq, setExamReq] = useState("");
  const [examCat, setExamCat] = useState<"clinique" | "biologie" | "imagerie">("clinique");
  const chrono = useCountdown(deadlineAt);
  const finalizedRef = useRef(false);

  // Autosave draft (debounced)
  const dbnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (dbnRef.current) clearTimeout(dbnRef.current);
    dbnRef.current = setTimeout(() => {
      saveFn({ data: { session_id: sessionId, draft: draft as unknown as Record<string, unknown> } }).catch(() => {});
    }, 1200);
    return () => { if (dbnRef.current) clearTimeout(dbnRef.current); };
  }, [draft, saveFn, sessionId]);

  const finalize = async (auto: boolean) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    try {
      await finalFn({ data: {
        session_id: sessionId,
        diagnosis: {
          main: draft.main, arguments_for: draft.arguments_for,
          differentials: draft.differentials,
          confirmation_exams: draft.confirmation_exams,
          extension_exams: draft.extension_exams,
          management: draft.management,
          surveillance: draft.surveillance, followup: draft.followup,
        },
        reasoning_justification: draft.reasoning_justification,
        auto,
      } });
      toast.success(auto ? t("jury.run.toastAutoSubmitted") : t("jury.run.toastSubmitted"));
      onFinalized();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("jury.errors.generic"));
      finalizedRef.current = false;
    }
  };

  // Auto-submit when time reaches 0
  useEffect(() => {
    if (chrono.ms <= 0 && !finalizedRef.current) {
      void finalize(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chrono.ms]);

  const sendMsg = useMutation({
    mutationFn: () => patientFn({ data: { session_id: sessionId, message: chatMsg.trim() } }),
    onSuccess: (r) => {
      setTranscript((t) => [...t, { role: "doctor", text: chatMsg.trim(), ts: new Date().toISOString() },
        { role: "patient", text: r.reply, ts: new Date().toISOString() }]);
      setChatMsg("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("jury.errors.generic")),
  });

  const askExam = useMutation({
    mutationFn: () => investFn({ data: { session_id: sessionId, category: examCat, request: examReq.trim() } }),
    onSuccess: (r) => {
      setExams((e) => [...e, { category: examCat, request: examReq.trim(), result: r.result, ts: new Date().toISOString() }]);
      setExamReq("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("jury.errors.generic")),
  });

  const chronoTone = useMemo(() => {
    const m = chrono.ms / 60000;
    if (m < 5) return "text-destructive";
    if (m < 15) return "text-amber-600";
    return "text-primary";
  }, [chrono.ms]);

  return (
    <section className="space-y-4">
      {/* Chrono */}
      <div className={`sticky top-16 z-20 flex items-center justify-between rounded-xl border-2 border-primary/30 bg-card px-5 py-3 shadow-[var(--shadow-card)]`}>
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${chronoTone}`} />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("jury.run.timeRemaining")}</span>
        </div>
        <p className={`font-mono text-2xl font-semibold ${chronoTone}`}>{chrono.label}</p>
      </div>

      {/* Cas */}
      <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <p className="text-xs uppercase tracking-wider text-primary">{t("jury.run.clinicalCase")}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{caseScenario}</p>
      </div>

      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat"><MessageSquare className="mr-2 h-4 w-4" />{t("jury.run.tabInterrogation")}</TabsTrigger>
          <TabsTrigger value="exams"><FlaskConical className="mr-2 h-4 w-4" />{t("jury.run.tabInvestigations")}</TabsTrigger>
          <TabsTrigger value="submit"><Send className="mr-2 h-4 w-4" />{t("jury.run.tabSubmission")}</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="rounded-2xl border bg-card p-5">
          <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-lg bg-secondary/30 p-3">
            {transcript.length === 0 && <p className="text-sm text-muted-foreground">{t("jury.run.chatEmpty")}</p>}
            {transcript.map((m, i) => (
              <div key={i} className={m.role === "doctor" ? "text-right" : "text-left"}>
                <div className={`inline-block max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "doctor" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (chatMsg.trim()) sendMsg.mutate(); }} className="mt-3 flex gap-2">
            <Input value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} placeholder={t("jury.run.chatPlaceholder")} disabled={sendMsg.isPending} />
            <Button type="submit" disabled={sendMsg.isPending || !chatMsg.trim()}>
              {sendMsg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="exams" className="rounded-2xl border bg-card p-5">
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={examCat} onChange={(e) => setExamCat(e.target.value as "clinique" | "biologie" | "imagerie")}
              className="rounded-md border bg-background px-2 py-1 text-sm">
              <option value="clinique">{t("jury.run.examClinical")}</option>
              <option value="biologie">{t("jury.run.examBiology")}</option>
              <option value="imagerie">{t("jury.run.examImaging")}</option>
            </select>
            <Input value={examReq} onChange={(e) => setExamReq(e.target.value)}
              placeholder={t("jury.run.examPlaceholder")} />
            <Button onClick={() => examReq.trim() && askExam.mutate()} disabled={askExam.isPending || !examReq.trim()}>
              {askExam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("jury.run.examPrescribe")}
            </Button>
          </div>
          <div className="mt-4 max-h-[380px] space-y-2 overflow-y-auto">
            {exams.length === 0 && <p className="text-sm text-muted-foreground">{t("jury.run.examEmpty")}</p>}
            {exams.map((x, i) => (
              <div key={i} className="rounded-lg border bg-background/50 p-3">
                <p className="text-xs uppercase tracking-wider text-primary">{x.category} · {x.request}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{x.result}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="submit" className="space-y-3 rounded-2xl border bg-card p-5">
          <p className="text-xs text-muted-foreground">{t("jury.run.submitHint")}</p>
          <Field label={t("jury.run.fieldMain")} value={draft.main} onChange={(v) => setDraft((d) => ({ ...d, main: v }))} required />
          <Area label={t("jury.run.fieldArguments")} value={draft.arguments_for} onChange={(v) => setDraft((d) => ({ ...d, arguments_for: v }))} />
          <Area label={t("jury.run.fieldDifferentials")} value={draft.differentials} onChange={(v) => setDraft((d) => ({ ...d, differentials: v }))} />
          <Area label={t("jury.run.fieldConfirmationExams")} value={draft.confirmation_exams} onChange={(v) => setDraft((d) => ({ ...d, confirmation_exams: v }))} />
          <Area label={t("jury.run.fieldExtensionExams")} value={draft.extension_exams} onChange={(v) => setDraft((d) => ({ ...d, extension_exams: v }))} />
          <Area label={t("jury.run.fieldManagement")} value={draft.management} onChange={(v) => setDraft((d) => ({ ...d, management: v }))} rows={4} />
          <Area label={t("jury.run.fieldSurveillance")} value={draft.surveillance} onChange={(v) => setDraft((d) => ({ ...d, surveillance: v }))} />
          <Area label={t("jury.run.fieldFollowup")} value={draft.followup} onChange={(v) => setDraft((d) => ({ ...d, followup: v }))} />
          <Area label={t("jury.run.fieldReasoning")} value={draft.reasoning_justification}
            onChange={(v) => setDraft((d) => ({ ...d, reasoning_justification: v }))} rows={4} />
          <div className="flex justify-end pt-2">
            <Button size="lg" onClick={() => {
              if (!draft.main.trim()) return toast.error(t("jury.run.errorMainRequired"));
              if (!draft.reasoning_justification.trim()) return toast.error(t("jury.run.errorReasoningRequired"));
              void finalize(false);
            }}>
              <Send className="mr-2 h-4 w-4" /> {t("jury.run.submitFinal")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
    </div>
  );
}
function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <p className="mt-1 font-serif text-2xl text-primary">{value}</p>
    </div>
  );
}

function ResultsTable({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const fn = useServerFn(getSessionResults);
  const { data } = useQuery({ queryKey: ["jury-results", sessionId], queryFn: () => fn({ data: { session_id: sessionId } }) });
  if (!data || !data.published) return null;
  type Row = {
    rank: number; user_id: string; display_name: string; country: string | null;
    score: number; reasoning_score: number | null; copy_quality_score: number | null;
    investigation_score: number | null; kymia_gold_count: number; duration_sec: number | null;
  };
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="flex items-center gap-2 font-serif text-2xl"><Trophy className="h-5 w-5 text-gold" />{t("jury.results.title")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("jury.results.tiebreak")}</p>
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{t("jury.results.rank")}</th>
              <th className="px-3 py-2 text-left">{t("jury.results.pseudo")}</th>
              <th className="px-3 py-2 text-left">{t("jury.results.country")}</th>
              <th className="px-3 py-2 text-right">{t("jury.results.score")}</th>
              <th className="px-3 py-2 text-right">{t("jury.results.reasoning")}</th>
              <th className="px-3 py-2 text-right">{t("jury.results.quality")}</th>
              <th className="px-3 py-2 text-right">{t("jury.results.investigation")}</th>
              <th className="px-3 py-2 text-right">{t("jury.results.time")}</th>
            </tr>
          </thead>
          <tbody>
            {(data.results as Row[]).map((r) => (
              <tr key={r.user_id} className="border-t hover:bg-secondary/30">
                <td className="px-3 py-2 font-semibold">{r.rank === 1 ? "🥇 1" : r.rank}</td>
                <td className="px-3 py-2">
                  {r.display_name}
                  {r.kymia_gold_count > 0 && <span className="ml-1 text-xs" title={t("jury.results.goldTitle")}>🥇×{r.kymia_gold_count}</span>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.country ?? "—"}</td>
                <td className="px-3 py-2 text-right font-semibold text-primary">{r.score}</td>
                <td className="px-3 py-2 text-right">{r.reasoning_score ?? "—"}</td>
                <td className="px-3 py-2 text-right">{r.copy_quality_score ?? "—"}</td>
                <td className="px-3 py-2 text-right">{r.investigation_score ?? "—"}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {r.duration_sec != null ? `${Math.floor(r.duration_sec / 60)}m ${r.duration_sec % 60}s` : "—"}
                </td>
              </tr>
            ))}
            {(data.results as Row[]).length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{t("jury.results.noCandidate")}</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
