import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, getDefaultAiModel } from "@/lib/ai-gateway.server";
import { SPECIALTIES, EXAM_CATEGORIES } from "@/lib/specialties";
import { getSubspecialty } from "@/lib/subspecialties";
import { planCase, fetchRecentCases, isTooSimilar } from "@/lib/case-selection.server";
import { fetchUserLang, langDirective, normalizeLang, type AiLang } from "@/lib/lang.server";

// ---------- Types ----------
export interface CaseData {
  patient: { age: number; sex: "M" | "F"; name: string; profession?: string };
  chief_complaint: string;
  hidden_diagnosis: string;
  hidden_pathophysiology: string;
  key_history: string[];
  key_findings: string[];
  expected_exams: string[];
  red_herrings: string[];
  difficulty: "facile" | "intermédiaire" | "difficile";
  opening_line: string;
  subspecialty?: string;
}

export interface ChatMessage { role: "user" | "assistant"; content: string; ts: number; }
export interface ExamRecord { category: string; name: string; result: string; ts: number; }
export interface Diagnosis {
  main: string; differentials: string; arguments_for: string;
  exams_supporting: string; management: string;
}
export interface Report {
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
  signed_by?: string;
}

// ---------- Helpers ----------
function getGateway() {
  return createLovableAiGatewayProvider();
}
function specialtyLabel(id: string) {
  return SPECIALTIES.find((s) => s.id === id)?.label ?? id;
}
function extractJson<T>(text: string): T {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fence ? fence[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Réponse IA non JSON");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

// AI-generated and legacy JSON can contain a single string instead of an
// array. Normalize it before it is stored or interpolated into a prompt.
function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(normalizeStringList);
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  return [];
}

function listToText(value: unknown) {
  return normalizeStringList(value).join(" ; ");
}

function normalizeCaseData(caseData: CaseData): CaseData {
  return {
    ...caseData,
    key_history: normalizeStringList(caseData.key_history),
    key_findings: normalizeStringList(caseData.key_findings),
    expected_exams: normalizeStringList(caseData.expected_exams),
    red_herrings: normalizeStringList(caseData.red_herrings),
  };
}

// La rotation des sous-spécialités est gérée par @/lib/case-selection.server

// Trial + Subscription gate — centralized in @/lib/access.functions.
import { assertCanConsult, FREE_TRIAL_LIMIT as ACCESS_FREE_TRIAL_LIMIT } from "@/lib/access.functions";
export const FREE_TRIAL_LIMIT = ACCESS_FREE_TRIAL_LIMIT;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertCanCreateConsultation(context: any) {
  await assertCanConsult(context, { incrementTrial: true });
}


// ---------- Create consultation ----------
export const createConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      specialty: z.string().min(2),
      subspecialty: z.string().min(2).max(60).optional().nullable(),
      cycle: z.enum(["premier", "second"]).optional().default("second"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertCanCreateConsultation(context);
    const lang = await fetchUserLang(context.supabase, context.userId);
    const gateway = getGateway();
    const model = gateway(getDefaultAiModel());
    const seed = Math.random().toString(36).slice(2);

    // ----- Moteur de diversification : plan de cas + anti-répétition -----
    const plan = await planCase({
      supabase: context.supabase,
      userId: context.userId,
      specialty: data.specialty,
      subspecialty: data.subspecialty ?? null,
    });
    const subSpec = plan.subspecialty;
    const subSpecLabel = subSpec ? (getSubspecialty(subSpec)?.label ?? subSpec) : null;
    const recentCases = await fetchRecentCases(context.supabase, context.userId, 20);

    const buildPrompt = (extraConstraint: string) => `Tu es Kymia Motcho, générateur de cas cliniques pour la formation médicale en Afrique.

Spécialité : ${specialtyLabel(data.specialty)}
${subSpecLabel ? `Sous-spécialité IMPOSÉE : ${subSpecLabel}. Le cas DOIT relever strictement de cette sous-spécialité.\n` : ""}Graine d'unicité : ${seed}

CAHIER DES CHARGES DU CAS (à respecter impérativement) :
- Pathologie cachée IMPOSÉE : ${plan.pathology.label}
- Angle de présentation IMPOSÉ : ${plan.angle}
- Tranche d'âge : ${plan.ageBandLabel} (âge exact entre ${plan.ageMin} et ${plan.ageMax})
- Sexe : ${plan.sex === "M" ? "masculin" : "féminin"}${plan.pregnancy ? " — patiente enceinte ou en post-partum (à intégrer de façon cliniquement cohérente)" : ""}
- Niveau de difficulté : ${plan.difficulty}
  · facile = signes assez typiques ; intermédiaire = présentation moins évidente avec plusieurs différentiels ; difficile = présentation atypique, association de pathologies, complication ou piège diagnostique.
- Élément de contexte : ${plan.context} (à n'exploiter que si c'est cliniquement pertinent ; ne jamais caricaturer le patient).

ANCRAGE AFRICAIN :
- Épidémiologie, comorbidités, plateau technique, noms et métiers doivent être crédibles en Afrique subsaharienne.
- Les examens complémentaires proposés doivent rester réalistes pour un hôpital de référence africain.
- N'introduis les éléments de contexte (automédication, médecine traditionnelle, retard de consultation…) que lorsqu'ils apportent quelque chose au raisonnement.

DIVERSITÉ — pathologies déjà rencontrées récemment par cet apprenant (à NE PAS reprendre) :
${plan.avoid.length ? plan.avoid.map((a: string) => `- ${a}`).join("\n") : "- (aucune)"}
${plan.nearMiss ? "\nCe cas est volontairement proche sémiologiquement du précédent MAIS d'une autre pathologie : le motif peut ressembler, le diagnostic doit être clairement différent (objectif : entraîner au diagnostic différentiel)." : ""}
${extraConstraint}

Génère UN cas clinique réaliste, cohérent et original : histoire de la maladie détaillée, facteurs de risque, antécédents, signes cliniques, gravité, évolution, examens et différentiels propres à CE patient. Le patient ouvre par UNE SEULE PHRASE naturelle (motif, sans jamais nommer le diagnostic).

Réponds STRICTEMENT en JSON valide selon ce schéma :
{
  "patient": { "age": <${plan.ageMin}-${plan.ageMax}>, "sex": "${plan.sex}", "name": "Prénom", "profession": "..." },
  "chief_complaint": "motif court",
  "hidden_diagnosis": "diagnostic exact",
  "hidden_pathophysiology": "physiopathologie courte",
  "key_history": ["élément 1", ...],
  "key_findings": ["signe attendu", ...],
  "expected_exams": ["examens utiles", ...],
  "red_herrings": ["pistes trompeuses possibles", ...],
  "difficulty": "${plan.difficulty === "difficile" ? "difficile" : plan.difficulty}",
  "opening_line": "Bonjour Docteur, ...",
  "subspecialty": "${subSpecLabel ?? ""}"
}${langDirective(lang)}`;

    async function generateCase(extra: string): Promise<CaseData> {
      const { text } = await generateText({ model, prompt: buildPrompt(extra), temperature: 1.0 });
      return normalizeCaseData(extractJson<CaseData>(text));
    }

    let caseData = await generateCase("");
    let check = isTooSimilar(
      {
        diagnosis: caseData.hidden_diagnosis ?? "",
        chief_complaint: caseData.chief_complaint ?? "",
        age: caseData.patient?.age ?? 0,
        sex: caseData.patient?.sex ?? "",
      },
      recentCases,
    );
    if (check.similar) {
      // Cas trop proche d'un cas récent : rejet et régénération sous contrainte renforcée.
      const rejected = caseData.hidden_diagnosis;
      caseData = await generateCase(
        `\nCONTRAINTE SUPPLÉMENTAIRE : la proposition « ${rejected} » a été REJETÉE car trop proche d'un cas déjà vu par l'apprenant. Change nettement le tableau clinique (autre motif d'entrée, autre âge dans la tranche autorisée, autre gravité, autres différentiels) tout en respectant la pathologie imposée.`,
      );
      check = isTooSimilar(
        {
          diagnosis: caseData.hidden_diagnosis ?? "",
          chief_complaint: caseData.chief_complaint ?? "",
          age: caseData.patient?.age ?? 0,
          sex: caseData.patient?.sex ?? "",
        },
        recentCases,
      );
    }
    caseData.subspecialty = subSpecLabel ?? caseData.subspecialty;

    const firstMessage: ChatMessage = { role: "assistant", content: caseData.opening_line, ts: Date.now() };
    const mentorMessages: ChatMessage[] = data.cycle === "premier" ? [{
      role: "assistant",
      content: lang === "en"
        ? `Hello, I am Dr Mekah, your mentor. Don't worry: we will move forward together, step by step.\n\nAlways start by introducing yourself to the patient, then explore the chief complaint (history, onset, characteristics). Remember: ask the right questions before ordering investigations. If you get stuck, click "Ask for advice".`
        : `Bonjour, je suis le Dr Mekah, votre mentor. Ne vous inquiétez pas : nous allons avancer ensemble pas à pas.\n\nCommencez toujours par vous présenter au patient, puis explorez le motif de consultation (histoire, ancienneté, caractéristiques). Rappelez-vous : posez d'abord les bonnes questions avant de demander des examens. Si vous êtes bloqué·e, cliquez sur « Demander un conseil ».`,
      ts: Date.now(),
    }] : [];

    const { data: row, error } = await context.supabase
      .from("consultations")
      .insert({
        user_id: context.userId,
        specialty: data.specialty,
        subspecialty: subSpec,
        cycle: data.cycle,
        language: lang,
        status: "in_progress",
        case_data: caseData as never,
        messages: [firstMessage] as never,
        exams: {} as never,
        mentor_messages: mentorMessages as never,
      } as never)
      .select("id").single();

    if (error || !row) throw new Error(error?.message ?? "Création impossible");

    // Mémoire de diversité (best-effort : ne bloque jamais la consultation)
    try {
      await context.supabase.from("case_registry").insert({
        user_id: context.userId,
        consultation_id: row.id,
        specialty: data.specialty,
        subspecialty: subSpec,
        pathology_key: plan.pathology.key,
        pathology_label: plan.pathology.label,
        diagnosis: caseData.hidden_diagnosis ?? null,
        chief_complaint: caseData.chief_complaint ?? null,
        presentation_angle: plan.angle,
        age: caseData.patient?.age ?? null,
        sex: caseData.patient?.sex ?? null,
        difficulty: caseData.difficulty ?? plan.difficulty,
      } as never);
    } catch { /* ignore */ }

    return { id: row.id as string };
  });


// ---------- Dr Mekah — mentor for Premier cycle ----------
export const askMentor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), question: z.string().min(1).max(1000).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("consultations").select("*").eq("id", data.id).single();
    if (error || !row) throw new Error("Consultation introuvable");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = row;
    if (r.user_id !== context.userId) throw new Error("Accès refusé");
    if (r.cycle !== "premier") throw new Error("Dr Mekah n'est disponible qu'en Premier cycle");

    const cd = r.case_data as CaseData;
    const messages = (r.messages as ChatMessage[]) ?? [];
    const exams = (r.exams as Record<string, ExamRecord[]>) ?? {};
    const mentor = (r.mentor_messages as ChatMessage[]) ?? [];

    const lang: AiLang = normalizeLang(r.language);
    const gateway = getGateway();
    const model = gateway(getDefaultAiModel());

    const transcript = messages.slice(-20).map((m) => `${m.role === "user" ? "Étudiant" : "Patient"}: ${m.content}`).join("\n");
    const examsList = Object.values(exams).flat().map((e) => `- ${e.name}`).join("\n");

    const system = `Tu es le Dr Mekah, mentor bienveillant et pédagogue accompagnant un étudiant en premier cycle de médecine.

TON RÔLE :
- Guide, ne fais JAMAIS le travail à la place de l'étudiant.
- Ne révèle JAMAIS le diagnostic ni la physiopathologie.
- Suggère UNE ou DEUX prochaines étapes concrètes (question à poser, examen à envisager, piste sémiologique).
- Enseigne la démarche : anamnèse structurée (motif, ATCD, HDLM), examen physique, puis examens complémentaires ciblés.
- Encourage, valide ce qui est bon, corrige gentiment ce qui manque.
- Réponse courte (3-6 phrases), en français simple.

CONTEXTE CACHÉ (à NE PAS révéler à l'étudiant) :
- Diagnostic réel : ${cd.hidden_diagnosis}
- Physiopathologie : ${cd.hidden_pathophysiology}
- Signes clés attendus : ${listToText(cd.key_findings)}
- Examens utiles : ${listToText(cd.expected_exams)}

INTERROGATOIRE ACTUEL :
${transcript || "(aucune question posée)"}

EXAMENS DÉJÀ DEMANDÉS :
${examsList || "(aucun)"}

Question de l'étudiant : ${data.question?.trim() || "Peux-tu me conseiller la prochaine étape ?"}${langDirective(lang)}`;

    const { text } = await generateText({ model, system, prompt: "Donne ton conseil pédagogique maintenant.", temperature: 0.7 });

    const advice: ChatMessage = { role: "assistant", content: text.trim(), ts: Date.now() };
    const userQ: ChatMessage | null = data.question?.trim()
      ? { role: "user", content: data.question.trim(), ts: Date.now() - 1 }
      : null;
    const nextMentor = [...mentor, ...(userQ ? [userQ] : []), advice];

    await context.supabase.from("consultations").update({ mentor_messages: nextMentor as never } as never).eq("id", data.id);
    return { advice };
  });

// ---------- Get consultation ----------
export const getConsultation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("consultations").select("*").eq("id", data.id).single();
    if (error || !row) throw new Error("Consultation introuvable");
    const cd = row.case_data as unknown as CaseData;
    const safeCase = row.status === "completed" ? cd : {
      patient: cd.patient, chief_complaint: cd.chief_complaint, difficulty: cd.difficulty,
    };
    return { ...row, case_data: safeCase };
  });

// ---------- List consultations ----------
export const listConsultations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("consultations")
      .select("id, specialty, status, score, created_at, completed_at, case_data")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => {
      const cd = r.case_data as unknown as CaseData;
      return {
        id: r.id as string,
        specialty: r.specialty as string,
        status: r.status as string,
        score: r.score as number | null,
        created_at: r.created_at as string,
        completed_at: r.completed_at as string | null,
        patient_label: `${cd.patient?.sex ?? "?"}, ${cd.patient?.age ?? "?"} ans`,
        chief_complaint: cd.chief_complaint ?? "",
      };
    });
  });

// ---------- Patient reply ----------
export const sendPatientMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), message: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("consultations").select("case_data, messages, status, user_id, language").eq("id", data.id).single();
    if (error || !row) throw new Error("Consultation introuvable");
    if (row.user_id !== context.userId) throw new Error("Accès refusé");
    if (row.status === "completed") throw new Error("Consultation déjà terminée");

    const cd = row.case_data as unknown as CaseData;
    const messages = (row.messages as unknown as ChatMessage[]) ?? [];
    const userMsg: ChatMessage = { role: "user", content: data.message, ts: Date.now() };
    const newHistory = [...messages, userMsg];

    const gateway = getGateway();
    const model = gateway(getDefaultAiModel());
    const systemPrompt = `Tu joues le rôle d'un patient virtuel pour une simulation médicale.

Identité : ${cd.patient.name}, ${cd.patient.age} ans, ${cd.patient.sex === "M" ? "homme" : "femme"}${cd.patient.profession ? `, ${cd.patient.profession}` : ""}.
Diagnostic réel (CACHÉ) : ${cd.hidden_diagnosis}
Physiopathologie cachée : ${cd.hidden_pathophysiology}
Histoire clinique : ${listToText(cd.key_history)}
Signes cliniques : ${listToText(cd.key_findings)}

RÈGLES :
- Parle comme un vrai patient, français naturel, parfois imprécis.
- Réponds UNIQUEMENT aux questions posées, brièvement (1-4 phrases).
- Ne révèle JAMAIS ton diagnostic, ne parles pas comme un médecin.
- Sans bonne question, tu n'évoques pas spontanément un symptôme important.
- Cohérence stricte avec la pathologie. Aucune contradiction.${langDirective(normalizeLang((row as { language?: string }).language))}`;

    const { text } = await generateText({
      model, system: systemPrompt,
      messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.8,
    });

    const assistantMsg: ChatMessage = { role: "assistant", content: text.trim(), ts: Date.now() };
    const finalHistory = [...newHistory, assistantMsg];
    await context.supabase.from("consultations").update({ messages: finalHistory as never }).eq("id", data.id);
    return { reply: assistantMsg };
  });

// ---------- Request exam ----------
export const requestExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      category: z.enum(["physical", "biology", "imaging", "custom"]),
      name: z.string().min(2).max(200),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("consultations").select("case_data, exams, status, user_id, language").eq("id", data.id).single();
    if (error || !row) throw new Error("Consultation introuvable");
    if (row.user_id !== context.userId) throw new Error("Accès refusé");
    if (row.status === "completed") throw new Error("Consultation terminée");

    const cd = row.case_data as unknown as CaseData;
    const exams = (row.exams as unknown as Record<string, ExamRecord[]>) ?? {};
    const list = exams[data.category] ?? [];
    if (list.some((e) => e.name.toLowerCase() === data.name.toLowerCase())) {
      return { result: list.find((e) => e.name.toLowerCase() === data.name.toLowerCase())! };
    }

    const gateway = getGateway();
    const model = gateway(getDefaultAiModel());
    const categoryLabel = data.category === "custom"
      ? "Examen libre (classer parmi clinique/biologie/imagerie/exploration)"
      : EXAM_CATEGORIES[data.category].label;

    const prompt = `Tu es un système hospitalier restituant un résultat d'examen.

Contexte CACHÉ du patient :
- Diagnostic réel : ${cd.hidden_diagnosis}
- Physiopathologie : ${cd.hidden_pathophysiology}
- Patient : ${cd.patient.sex}, ${cd.patient.age} ans
- Signes attendus : ${listToText(cd.key_findings)}

Examen demandé (${categoryLabel}) : ${data.name}

Comprends la demande même si imprécise. Si l'examen est hors champ, réponds « Examen non réalisable. » (en anglais : "Investigation not available."). Sinon, restitue UNIQUEMENT le résultat brut style compte-rendu hospitalier (max 10 lignes). Aucune interprétation. Valeurs cohérentes avec le diagnostic caché.${langDirective(normalizeLang((row as { language?: string }).language))}`;

    const { text } = await generateText({ model, prompt, temperature: 0.4 });
    const record: ExamRecord = { category: data.category, name: data.name, result: text.trim(), ts: Date.now() };
    const newExams = { ...exams, [data.category]: [...list, record] };
    await context.supabase.from("consultations").update({ exams: newExams as never }).eq("id", data.id);
    return { result: record };
  });

// ---------- Pause / resume ----------
export const pauseConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("consultations").update({ status: "paused" }).eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });
export const resumeConsultation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("consultations").update({ status: "in_progress" }).eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

// ---------- Submit diagnosis + STRICT report ----------
export const submitDiagnosis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      diagnosis: z.object({
        main: z.string().min(2).max(500),
        differentials: z.string().max(2000),
        arguments_for: z.string().max(2000),
        exams_supporting: z.string().max(2000),
        management: z.string().max(3000),
      }),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("consultations").select("case_data, messages, exams, user_id, specialty, cycle, language, status, report").eq("id", data.id).single();
    if (error || !row) throw new Error("Consultation introuvable");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((row as any).user_id !== context.userId) throw new Error("Accès refusé");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cycle: string = (row as any).cycle ?? "second";
    // A client retry (for example after a network interruption) must never
    // generate or count a second correction for the same consultation.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((row as any).status === "completed" && (row as any).report) {
      return { report: (row as any).report as Report, cycle };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lang: AiLang = normalizeLang((row as any).language);

    const cd = row.case_data as unknown as CaseData;
    const messages = (row.messages as unknown as ChatMessage[]) ?? [];
    const exams = (row.exams as unknown as Record<string, ExamRecord[]>) ?? {};
    const transcript = messages.map((m) => `${m.role === "user" ? "Médecin" : "Patient"}: ${m.content}`).join("\n");
    const examsList = Object.values(exams).flat().map((e) => `- [${e.category}] ${e.name} → ${e.result.replace(/\n/g, " ")}`).join("\n");

    const gateway = getGateway();
    const model = gateway(getDefaultAiModel());

    const prompt = `Tu es Kymia Motcho, professeur agrégé de médecine SÉVÈRE et EXIGEANT évaluant une consultation simulée. Ta notation est celle d'un jury universitaire strict — ne cède JAMAIS à la complaisance.

CAS RÉEL :
- Diagnostic : ${cd.hidden_diagnosis}
- Physiopathologie : ${cd.hidden_pathophysiology}
- Signes attendus : ${listToText(cd.key_findings)}
- Examens vraiment utiles : ${listToText(cd.expected_exams)}
- Difficulté : ${cd.difficulty}

TRANSCRIPT :
${transcript || "(aucun)"}

EXAMENS DEMANDÉS :
${examsList || "(aucun)"}

DIAGNOSTIC POSÉ :
- Principal : ${data.diagnosis.main}
- Différentiels : ${data.diagnosis.differentials}
- Arguments cliniques en faveur : ${data.diagnosis.arguments_for}
- Arguments paracliniques en faveur : ${data.diagnosis.exams_supporting}
- Prise en charge : ${data.diagnosis.management}

BARÈME STRICT (à respecter absolument) :
- Diagnostic principal FAUX ou HORS SUJET → score global ≤ 25.
- Diagnostic partiellement juste (famille correcte, pas le bon) → 40–55.
- Diagnostic juste MAIS interrogatoire pauvre (< 5 questions pertinentes) ou examens essentiels oubliés → 55–70.
- Diagnostic juste + interrogatoire structuré + examens pertinents + différentiels valables + PEC correcte → 75–88.
- Excellence à TOUS niveaux (interrogatoire exhaustif, différentiels solides, examens optimaux sans superflu, PEC complète et justifiée) → 89–100.

Pénalise fermement : questions cruciales oubliées, examens inutiles, mauvais raisonnement, PEC incomplète. Un utilisateur ne doit obtenir une note élevée QUE si sa démarche est réellement excellente.

Chaque sous-note (0-100) doit être cohérente avec le score global et respecter le barème ci-dessus.

Le champ "reference_course" est obligatoire : rédige un véritable cours de révision détaillé sur la pathologie diagnostiquée, en Markdown structuré avec des titres. Il doit couvrir la définition, la physiopathologie, les facteurs de risque, la clinique, la démarche diagnostique, la prise en charge, les complications, le pronostic et les points clés à retenir. Adapte-le au contexte africain lorsque cela est pertinent.

Réponds STRICTEMENT en JSON valide :
{
  "score": <0-100>,
  "diagnostic_accuracy": <0-100>,
  "interrogation_quality": <0-100>,
  "exam_quality": <0-100>,
  "exam_relevance": <0-100>,
  "reasoning_speed": <0-100>,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missed_questions": ["questions importantes non posées"],
  "missed_exams": ["examens indispensables oubliés"],
  "unnecessary_exams": ["examens inutiles prescrits"],
  "expert_approach": "démarche d'expert étape par étape",
  "full_explanation": "explication pédagogique complète, signée Kymia Motcho",
  "pathophysiology": "physiopathologie détaillée",
  "advice": "conseils personnalisés — signés Kymia Motcho",
  "reference_course": "cours détaillé en Markdown sur la pathologie : définition, physiopathologie, épidémiologie/facteurs de risque, clinique, diagnostic, examens complémentaires, prise en charge, complications, pronostic et points clés à retenir"
}${langDirective(lang)}`;

    // The reference course is generated together with the correction so it is
    // immediately available on the report page after the consultation.
    const { text } = await generateText({ model, prompt, temperature: 0.2 });
    const report = extractJson<Report>(text);
    report.signed_by = "Kymia Motcho";

    await context.supabase.from("consultations").update({
      diagnosis: data.diagnosis as never,
      report: report as never,
      score: report.score,
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", data.id);

    // Only Second cycle consultations feed the world leaderboard / competitive stats
    if (cycle === "second") {
      const { data: prof } = await context.supabase
        .from("profiles").select("total_score, consultations_count").eq("id", context.userId).single();
      await context.supabase.from("profiles").update({
        total_score: (prof?.total_score ?? 0) + report.score,
        consultations_count: (prof?.consultations_count ?? 0) + 1,
      }).eq("id", context.userId);
    }

    return { report, cycle };
  });

// ---------- Dashboard ----------
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: prof }, { data: consults }, subRes] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
      context.supabase.from("consultations").select("specialty, score, status").eq("user_id", context.userId),
      context.supabase.from("subscriptions").select("status, plan, expires_at")
        .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const completed = (consults ?? []).filter((c) => c.status === "completed" && c.score != null);
    const avg = completed.length
      ? Math.round(completed.reduce((s, c) => s + (c.score ?? 0), 0) / completed.length) : 0;
    const passRate = completed.length
      ? Math.round((completed.filter((c) => (c.score ?? 0) >= 60).length / completed.length) * 100) : 0;
    const bySpec: Record<string, number> = {};
    for (const c of consults ?? []) bySpec[c.specialty] = (bySpec[c.specialty] ?? 0) + 1;
    const sub = subRes.data as { status?: string; plan?: string; expires_at?: string | null } | null;
    const isActive = sub && (sub.status === "active" || sub.status === "free")
      && (!sub.expires_at || new Date(sub.expires_at) > new Date());
    return {
      profile: prof,
      total: consults?.length ?? 0,
      completed: completed.length,
      avg_score: avg,
      pass_rate: passRate,
      by_specialty: bySpec,
      subscription: sub ? { status: sub.status ?? null, plan: sub.plan ?? null, expires_at: sub.expires_at ?? null, active: Boolean(isActive) } : null,
    };
  });

// ---------- Leaderboard (by AVERAGE score) ----------
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("get_leaderboard_v2" as never);
    return (data ?? []) as Array<{
      id: string; display_name: string; country: string | null;
      avg_score: number; consultations_count: number; total_score: number; kymia_gold_count: number;
    }>;
  });

// ---------- Update profile ----------
export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      display_name: z.string().trim().min(1).max(60),
      level: z.string().max(40),
      country: z.string().max(60).optional().nullable(),
      whatsapp: z.string().max(30).optional().nullable(),
      profession: z.string().max(60).optional().nullable(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({
      display_name: data.display_name,
      level: data.level,
      country: data.country ?? null,
      whatsapp: data.whatsapp ?? null,
      profession: data.profession ?? null,
    }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Check my subscription ----------
export const mySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: sub } = await context.supabase.from("subscriptions")
      .select("status, plan, expires_at").eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: active } = await context.supabase.rpc("is_subscription_active" as never, { _user_id: context.userId } as never);
    return { subscription: sub ?? null, active: Boolean(active) };
  });
