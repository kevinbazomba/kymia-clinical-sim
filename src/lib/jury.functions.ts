import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider, getDefaultAiModel } from "@/lib/ai-gateway.server";
import { SPECIALTIES } from "@/lib/specialties";
import { fetchUserLang, langDirective, normalizeLang, type AiLang } from "@/lib/lang.server";

/**
 * KYMIA JURY — Refonte 72h + chrono 45min personnel
 *
 * Édition hebdomadaire :
 *   - Ouverture : vendredi 00:00 (heure de Kinshasa, UTC+2) = jeudi 22:00 UTC
 *   - Fermeture : dimanche 23:59 (Kinshasa) = dimanche 21:59 UTC
 *   - Publication des résultats : lundi 00:00 (Kinshasa) = dimanche 22:00 UTC
 *
 * Une seule tentative par édition et par utilisateur. Chronomètre personnel de
 * 45 minutes non interruptible, borné par la fin de l'édition. Auto-soumission
 * quand le temps est écoulé (contrôle serveur + fallback cron).
 */

const CHRONO_MINUTES = 45;

// ---------- Edition helpers ----------

// Retourne le vendredi 00:00 (Kinshasa) qui ouvre l'édition contenant `at`
// (ou la prochaine si `at` tombe hors fenêtre).
export function editionForDate(at: Date): { key: string; opensAt: Date; closesAt: Date; resultsAt: Date; upcoming: boolean } {
  // Kinshasa = UTC+2, sans DST.
  // On travaille en instants UTC. Vendredi 00:00 Kinshasa == jeudi 22:00 UTC.
  const nowUtc = at.getTime();
  // Trouver le jeudi 22:00 UTC de la semaine courante ou passée
  const d = new Date(at);
  const dayUtc = d.getUTCDay(); // 0..6, Thu=4
  // Décalage jours depuis jeudi
  const diffFromThu = (dayUtc + 7 - 4) % 7; // 0 si jeudi
  const thisWeekThu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffFromThu, 22, 0, 0));
  let opens = thisWeekThu;
  // Fenêtre : opens (Fri 00:00 Kinshasa) → opens + 72h (Mon 00:00 Kinshasa)
  const closes = new Date(opens.getTime() + 72 * 3600 * 1000 - 60 * 1000); // Sun 23:59 Kinshasa
  const results = new Date(opens.getTime() + 72 * 3600 * 1000); // Mon 00:00 Kinshasa

  if (nowUtc >= opens.getTime() && nowUtc <= closes.getTime()) {
    return { key: keyOf(opens), opensAt: opens, closesAt: closes, resultsAt: results, upcoming: false };
  }
  if (nowUtc < opens.getTime()) {
    return { key: keyOf(opens), opensAt: opens, closesAt: closes, resultsAt: results, upcoming: true };
  }
  // Après la fin → semaine suivante
  opens = new Date(opens.getTime() + 7 * 86400 * 1000);
  const nClose = new Date(opens.getTime() + 72 * 3600 * 1000 - 60 * 1000);
  const nResults = new Date(opens.getTime() + 72 * 3600 * 1000);
  return { key: keyOf(opens), opensAt: opens, closesAt: nClose, resultsAt: nResults, upcoming: true };
}
function keyOf(opens: Date): string {
  return `edition-${opens.toISOString().slice(0, 10)}`; // ex : edition-2026-07-16
}

async function generateCase(specialty: string) {
  const gateway = createLovableAiGatewayProvider();
  const model = gateway(getDefaultAiModel());
  const seed = Math.random().toString(36).slice(2);
  const prompt = `Génère un cas clinique inédit et EXIGEANT pour le JURY Kymia (spécialité ${specialty}, graine ${seed}).
Réponds STRICTEMENT en JSON :
{
  "patient": { "age": <1-95>, "sex": "M"|"F", "name": "Prénom", "profession": "..." },
  "chief_complaint": "motif",
  "clinical_scenario": "présentation initiale riche (contexte, motif, ancienneté), 4-8 phrases, en français, SANS révéler le diagnostic",
  "hidden_history": "antécédents complets connus du patient (à distribuer au fil de l'interrogatoire)",
  "hidden_physical": "signes cliniques objectivement présents",
  "hidden_diagnosis": "diagnostic exact",
  "hidden_pathophysiology": "physiopathologie",
  "expected_exams": ["examens de confirmation utiles"],
  "expected_extension_exams": ["examens d'extension si pertinents"],
  "expected_management": "prise en charge attendue",
  "difficulty": "intermédiaire"|"difficile"
}`;
  const { text } = await generateText({ model, prompt, temperature: 0.9 });
  const raw = text.trim();
  const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
  return JSON.parse(raw.slice(s, e + 1));
}

// Récupère ou crée la session correspondant à l'édition (unique via edition_key)
async function ensureSession(edition: ReturnType<typeof editionForDate>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: existing } = await supabaseAdmin.from("jury_sessions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("*").eq("edition_key" as any, edition.key).maybeSingle();
  if (existing) return existing;

  const specialty = SPECIALTIES[Math.floor(Math.random() * SPECIALTIES.length)].id;
  let caseData: unknown = null;
  let status = "upcoming";
  const now = new Date();
  // Génère le cas seulement si la fenêtre est ouverte ou proche
  if (now.getTime() >= edition.opensAt.getTime() - 15 * 60 * 1000) {
    try {
      caseData = await generateCase(specialty);
      if (now.getTime() >= edition.opensAt.getTime()) status = "live";
    } catch (e) {
      console.error("jury: génération cas échouée", e);
    }
  }
  const insert = {
    scheduled_at: edition.opensAt.toISOString(),
    status,
    time_limit_minutes: CHRONO_MINUTES,
    specialty,
    case_data: caseData,
    starts_at: edition.opensAt.toISOString(),
    ends_at: edition.closesAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opens_at: edition.opensAt.toISOString() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    closes_at: edition.closesAt.toISOString() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    edition_key: edition.key as any,
  };
  const { data: created, error } = await supabaseAdmin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("jury_sessions").insert(insert as any).select("*").single();
  if (error) throw new Error(error.message);
  return created;
}

/**
 * The jury case is shared by every candidate, so it is generated once (in French)
 * then translated on demand. The translation is cached inside case_data.i18n_en.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function juryCaseInLang(session: any, lang: AiLang) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cd: any = session?.case_data ?? {};
  const base = {
    patient: cd.patient ?? null,
    chief_complaint: String(cd.chief_complaint ?? ""),
    clinical_scenario: String(cd.clinical_scenario ?? ""),
    difficulty: String(cd.difficulty ?? ""),
  };
  if (lang !== "en" || !base.chief_complaint) return base;
  if (cd.i18n_en?.chief_complaint) return { ...base, ...cd.i18n_en, patient: cd.patient ?? null };
  try {
    const gateway = createLovableAiGatewayProvider();
    const model = gateway(getDefaultAiModel());
    const { text } = await generateText({
      model,
      temperature: 0.1,
      prompt: `Translate this clinical vignette into natural medical English. Keep the meaning strictly identical, never reveal or guess a diagnosis. Answer STRICTLY as JSON:
{"chief_complaint":"...","clinical_scenario":"..."}

chief_complaint: ${base.chief_complaint}
clinical_scenario: ${base.clinical_scenario}`,
    });
    const raw = text.trim();
    const st = raw.indexOf("{"); const en = raw.lastIndexOf("}");
    const parsed = JSON.parse(raw.slice(st, en + 1)) as { chief_complaint: string; clinical_scenario: string };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabaseAdmin.from("jury_sessions").update({ case_data: { ...cd, i18n_en: parsed } as any } as any).eq("id", session.id);
    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

// ---------- Public: state of the current jury for the user ----------
export const getCurrentJury = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Accès réservé : ACTIF, GRATUIT (et admin)
    const { computeAccess } = await import("@/lib/access.functions");
    const access = await computeAccess(context);
    if (!access.can_jury) {
      const code =
        access.status === "suspended" ? "SUBSCRIPTION_SUSPENDED"
        : access.status === "expired" ? "SUBSCRIPTION_EXPIRED"
        : access.status === "trial_exhausted" ? "FREE_TRIAL_EXHAUSTED"
        : access.status === "account_suspended" ? "ACCOUNT_SUSPENDED"
        : "ACCESS_DENIED";
      throw new Error(code);
    }

    const edition = editionForDate(new Date());
    const session = await ensureSession(edition);

    // Ma soumission éventuelle
    const { data: mine } = await context.supabase.from("jury_submissions" as never)
      .select("id, started_at, deadline_at, is_finalized, submitted_at, score, auto_submitted, draft, transcript, exams, reasoning_justification")
      .eq("session_id", (session as { id: string }).id)
      .eq("user_id", context.userId).maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = session;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lang = await fetchUserLang(context.supabase, context.userId);
    const publicCase = s.case_data ? await juryCaseInLang(s, lang) : null;

    return {
      edition: {
        key: edition.key,
        opens_at: edition.opensAt.toISOString(),
        closes_at: edition.closesAt.toISOString(),
        results_at: edition.resultsAt.toISOString(),
        upcoming: edition.upcoming,
      },
      session: {
        id: String(s.id), status: String(s.status), specialty: (s.specialty ?? null) as string | null,
        results_published_at: (s.results_published_at ?? null) as string | null,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      case: publicCase as any,
      chrono_minutes: CHRONO_MINUTES,
      language: lang,
      access,
      my_submission: mine ?? null,
    };
  });

// ---------- Start my attempt (démarre le chrono) ----------
export const startMyJury = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { computeAccess } = await import("@/lib/access.functions");
    const access = await computeAccess(context);
    if (!access.can_jury) throw new Error("ACCESS_DENIED");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("jury_sessions")
      .select("*").eq("id", data.session_id).single();
    if (!session) throw new Error("Session introuvable");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = session;
    const now = new Date();
    const opens = new Date(s.opens_at ?? s.scheduled_at);
    const closes = new Date(s.closes_at ?? s.ends_at);
    if (now < opens) throw new Error("EDITION_NOT_OPEN");
    if (now > closes) throw new Error("EDITION_CLOSED");

    // Une seule tentative
    const { data: mine } = await supabaseAdmin.from("jury_submissions")
      .select("id, started_at").eq("session_id", s.id).eq("user_id", context.userId).maybeSingle();
    if (mine) return { ok: true, submission_id: (mine as { id: string }).id };

    const deadline = new Date(Math.min(now.getTime() + CHRONO_MINUTES * 60_000, closes.getTime()));
    const { data: created, error } = await supabaseAdmin.from("jury_submissions").insert({
      session_id: s.id, user_id: context.userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      started_at: now.toISOString() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deadline_at: deadline.toISOString() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      is_finalized: false as any,
      diagnosis: {}, report: {}, score: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      language: (await fetchUserLang(context.supabase, context.userId)) as any,
      draft: {}, transcript: [], exams: [],
      submitted_at: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, submission_id: (created as { id: string }).id };
  });

// ---------- Sauvegarde du brouillon (autosave) ----------
export const saveJuryDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    session_id: z.string().uuid(),
    draft: z.record(z.string(), z.unknown()),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabaseAdmin.from("jury_submissions").update({ draft: data.draft as any } as any)
      .eq("session_id", data.session_id).eq("user_id", context.userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("is_finalized" as any, false);
    return { ok: true };
  });

// ---------- Dialogue patient (interrogatoire) ----------
export const juryPatientReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    session_id: z.string().uuid(),
    message: z.string().min(1).max(1000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("jury_sessions")
      .select("case_data").eq("id", data.session_id).single();
    if (!session) throw new Error("Session introuvable");
    const { data: mine } = await supabaseAdmin.from("jury_submissions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, transcript, deadline_at, is_finalized, language" as any)
      .eq("session_id", data.session_id).eq("user_id", context.userId).maybeSingle();
    if (!mine) throw new Error("Tentative non démarrée");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = mine;
    if (m.is_finalized) throw new Error("Copie déjà soumise");
    if (new Date(m.deadline_at) < new Date()) throw new Error("TIME_OVER");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cd: any = (session as any).case_data ?? {};
    const gateway = createLovableAiGatewayProvider();
    const model = gateway(getDefaultAiModel());

    const transcript = Array.isArray(m.transcript) ? m.transcript : [];
    const history = transcript.slice(-12).map((t: { role: string; text: string }) => `${t.role === "doctor" ? "Médecin" : "Patient"}: ${t.text}`).join("\n");

    const prompt = `Tu joues un patient réel en consultation. RÈGLES ABSOLUES :
- Tu ne connais PAS ton diagnostic — tu réponds en langage naturel, spontanément.
- Réponds uniquement à la question posée, sans monologuer.
- Tu peux hésiter, dire "je ne sais pas", te souvenir progressivement.
- Ne révèle JAMAIS de vocabulaire médical technique.

Contexte réel (pour ta cohérence, ne l'expose pas) :
- Motif : ${cd.chief_complaint}
- Scénario initial : ${cd.clinical_scenario}
- Antécédents : ${cd.hidden_history}
- Signes objectivement présents : ${cd.hidden_physical}

Historique de l'échange :
${history}

Nouvelle question du médecin : "${data.message}"

Ta réponse (1 à 4 phrases, ton naturel) :${langDirective(normalizeLang(m.language))}`;
    const { text } = await generateText({ model, prompt, temperature: 0.7 });
    const reply = text.trim();

    const updated = [...transcript, { role: "doctor", text: data.message, ts: new Date().toISOString() },
      { role: "patient", text: reply, ts: new Date().toISOString() }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabaseAdmin.from("jury_submissions").update({ transcript: updated as any } as any).eq("id", m.id);
    return { reply };
  });

// ---------- Investigations (clinique / biologie / imagerie) ----------
export const juryInvestigate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    session_id: z.string().uuid(),
    category: z.enum(["clinique", "biologie", "imagerie"]),
    request: z.string().min(2).max(400),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("jury_sessions")
      .select("case_data").eq("id", data.session_id).single();
    if (!session) throw new Error("Session introuvable");
    const { data: mine } = await supabaseAdmin.from("jury_submissions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, exams, deadline_at, is_finalized, language" as any)
      .eq("session_id", data.session_id).eq("user_id", context.userId).maybeSingle();
    if (!mine) throw new Error("Tentative non démarrée");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = mine;
    if (m.is_finalized) throw new Error("Copie déjà soumise");
    if (new Date(m.deadline_at) < new Date()) throw new Error("TIME_OVER");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cd: any = (session as any).case_data ?? {};
    const gateway = createLovableAiGatewayProvider();
    const model = gateway(getDefaultAiModel());

    const prompt = `Tu es Kymia Motcho. Génère le résultat RÉALISTE d'une investigation demandée par le candidat, strictement cohérent avec la pathologie cachée.
- Diagnostic réel (secret) : ${cd.hidden_diagnosis}
- Physiopathologie : ${cd.hidden_pathophysiology}
- Signes cliniques attendus : ${cd.hidden_physical}
- Catégorie demandée : ${data.category}
- Demande : "${data.request}"

Rends un texte concis, structuré (valeurs chiffrées avec unités et normes quand pertinent), sans révéler le diagnostic explicitement. Si la demande est totalement hors-sujet ou impossible, indique "Examen non réalisable ou hors indication" (in English: "Investigation not available or not indicated").${langDirective(normalizeLang(m.language))}`;
    const { text } = await generateText({ model, prompt, temperature: 0.4 });
    const result = text.trim();

    const exams = Array.isArray(m.exams) ? m.exams : [];
    exams.push({ category: data.category, request: data.request, result, ts: new Date().toISOString() });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabaseAdmin.from("jury_submissions").update({ exams: exams as any } as any).eq("id", m.id);
    return { result };
  });

// ---------- Soumission finale (manuelle ou auto) ----------
const finalizeSchema = z.object({
  session_id: z.string().uuid(),
  diagnosis: z.object({
    main: z.string().max(500),
    arguments_for: z.string().max(3000),
    differentials: z.string().max(3000),
    confirmation_exams: z.string().max(3000),
    extension_exams: z.string().max(3000),
    management: z.string().max(4000),
    surveillance: z.string().max(2000).optional().default(""),
    followup: z.string().max(2000).optional().default(""),
  }),
  reasoning_justification: z.string().max(4000).optional().default(""),
  auto: z.boolean().optional().default(false),
});

async function gradeSubmission(caseData: Record<string, unknown>, diagnosis: Record<string, string>, reasoning: string, transcript: unknown[], exams: unknown[], lang: AiLang = "fr") {
  const gateway = createLovableAiGatewayProvider();
  const model = gateway(getDefaultAiModel());

  const prompt = `Tu es Kymia Motcho, président du JURY Kymia — barème sévère universitaire.

RÈGLE : trouver le bon diagnostic ne garantit PAS une bonne note. Une démarche complète (interrogatoire, examen, investigations, raisonnement, différentiels, PEC) est requise pour l'excellence.

CAS RÉEL :
- Diagnostic : ${caseData.hidden_diagnosis}
- Physiopathologie : ${caseData.hidden_pathophysiology}
- Examens attendus : ${(caseData.expected_exams as string[] | undefined)?.join(" ; ")}
- Extension : ${(caseData.expected_extension_exams as string[] | undefined)?.join(" ; ")}
- PEC attendue : ${caseData.expected_management}

TRANSCRIPT INTERROGATOIRE (${transcript.length} messages) : ${JSON.stringify(transcript).slice(0, 4000)}
INVESTIGATIONS DEMANDÉES (${exams.length}) : ${JSON.stringify(exams).slice(0, 4000)}

COPIE FINALE DU CANDIDAT :
- Diagnostic principal : ${diagnosis.main}
- Arguments : ${diagnosis.arguments_for}
- Différentiels : ${diagnosis.differentials}
- Examens de confirmation : ${diagnosis.confirmation_exams}
- Examens d'extension : ${diagnosis.extension_exams}
- Prise en charge : ${diagnosis.management}
- Surveillance : ${diagnosis.surveillance ?? ""}
- Suivi : ${diagnosis.followup ?? ""}
- Justification du raisonnement : ${reasoning}

Note chaque critère /100 puis calcule une note pondérée globale. Barème :
- Diagnostic faux + démarche pauvre : 0-20
- Famille correcte mais démarche superficielle : 25-45
- Diagnostic juste mais démarche incomplète : 50-70
- Diagnostic juste + démarche solide : 75-85
- Excellence universitaire : 88-100

Réponds STRICTEMENT en JSON :
{
  "score": <0-100>,
  "reasoning_score": <0-100>,
  "copy_quality_score": <0-100>,
  "investigation_score": <0-100>,
  "criteria": {
    "qualite_interrogatoire": <0-100>,
    "qualite_examen_clinique": <0-100>,
    "pertinence_examens": <0-100>,
    "examens_oublies": <0-100>,
    "examens_inutiles": <0-100>,
    "interpretation_resultats": <0-100>,
    "qualite_raisonnement": <0-100>,
    "diagnostic_principal": <0-100>,
    "differentiels": <0-100>,
    "prise_en_charge": <0-100>,
    "conformite_recommandations": <0-100>
  },
  "answer_analysis": "analyse détaillée point par point",
  "correct_points": ["..."],
  "errors": ["..."],
  "unnecessary_exams": ["..."],
  "missed_exams": ["..."],
  "expected_approach": "démarche attendue étape par étape",
  "final_diagnosis": "diagnostic final avec justification",
  "differentials": "différentiels détaillés",
  "confirmation_exams": "examens de confirmation et intérêt",
  "extension_exams": "examens d'extension et intérêt",
  "management": "PEC complète",
  "pathophysiology": "physiopathologie complète",
  "semiology": "sémiologie exhaustive",
  "references": ["..."],
  "expert_answer": "synthèse experte Kymia Motcho",
  "signed_by": "Kymia Motcho"
}${langDirective(lang)}`;
  const { text } = await generateText({ model, prompt, temperature: 0.2 });
  const raw = text.trim();
  const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
  return JSON.parse(raw.slice(s, e + 1));
}

export const finalizeMyJury = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => finalizeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session } = await supabaseAdmin.from("jury_sessions")
      .select("case_data, opens_at, closes_at, id").eq("id", data.session_id).single();
    if (!session) throw new Error("Session introuvable");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = session;

    const { data: mine } = await supabaseAdmin.from("jury_submissions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, started_at, deadline_at, is_finalized, transcript, exams, language" as any)
      .eq("session_id", data.session_id).eq("user_id", context.userId).maybeSingle();
    if (!mine) throw new Error("Tentative introuvable");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = mine;
    if (m.is_finalized) return { already: true };

    const now = new Date();
    const overtime = new Date(m.deadline_at) < now;
    // Autorise la soumission sur le fil (auto=true) même après l'échéance, sinon refuse.
    if (overtime && !data.auto) throw new Error("TIME_OVER");

    const report = await gradeSubmission(
      (s.case_data ?? {}) as Record<string, unknown>,
      data.diagnosis as unknown as Record<string, string>,
      data.reasoning_justification,
      m.transcript ?? [], m.exams ?? [], normalizeLang(m.language),
    );
    const startedMs = new Date(m.started_at).getTime();
    const durationSec = Math.max(0, Math.round((Math.min(now.getTime(), new Date(m.deadline_at).getTime()) - startedMs) / 1000));

    await supabaseAdmin.from("jury_submissions").update({
      diagnosis: data.diagnosis, report, score: report.score ?? 0,
      reasoning_justification: data.reasoning_justification,
      reasoning_score: report.reasoning_score ?? report.criteria?.qualite_raisonnement ?? 0,
      copy_quality_score: report.copy_quality_score ?? 0,
      investigation_score: report.investigation_score ?? report.criteria?.pertinence_examens ?? 0,
      duration_sec: durationSec,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      is_finalized: true as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      auto_submitted: !!data.auto as any,
      submitted_at: now.toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).eq("id", m.id);

    return { ok: true, report };
  });

// ---------- Publication des résultats + attribution du Gold ----------
export async function publishEdition(sessionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: session } = await supabaseAdmin.from("jury_sessions")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("id, results_published_at, scheduled_at, specialty, closes_at" as any).eq("id", sessionId).single();
  if (!session) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = session;
  if (s.results_published_at) return;

  const { data: subs } = await supabaseAdmin.from("jury_submissions")
    .select("user_id, score, reasoning_score, copy_quality_score, investigation_score, duration_sec")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq("session_id", sessionId).eq("is_finalized" as any, true)
    .order("score", { ascending: false, nullsFirst: false })
    .order("reasoning_score", { ascending: false, nullsFirst: false })
    .order("copy_quality_score", { ascending: false, nullsFirst: false })
    .order("investigation_score", { ascending: false, nullsFirst: false })
    .order("duration_sec", { ascending: true, nullsFirst: false })
    .limit(1);
  const winnerId = (subs?.[0] as { user_id: string } | undefined)?.user_id ?? null;

  await supabaseAdmin.from("jury_sessions").update({
    status: "completed", winner_user_id: winnerId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results_published_at: new Date().toISOString() as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any).eq("id", sessionId);

  if (winnerId) {
    const closes = new Date(s.closes_at ?? s.scheduled_at);
    const jan1 = new Date(Date.UTC(closes.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((closes.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7);
    const weekLabel = `Semaine ${weekNum} – ${closes.getUTCFullYear()}`;
    const { data: prof } = await supabaseAdmin.from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("kymia_gold_count, jury_wins" as any).eq("id", winnerId).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = prof ?? {};
    const wins = Array.isArray(p.jury_wins) ? p.jury_wins : [];
    wins.unshift({
      session_id: sessionId, scheduled_at: s.scheduled_at, week_label: weekLabel,
      specialty: s.specialty, won_at: new Date().toISOString(),
    });
    await supabaseAdmin.from("profiles").update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kymia_gold_count: (p.kymia_gold_count ?? 0) + 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jury_wins: wins,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).eq("id", winnerId);
  }
}

// ---------- Résultats officiels (visibles après publication) ----------
export const getSessionResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: session } = await context.supabase.from("jury_sessions" as never)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, scheduled_at, specialty, status, winner_user_id, results_published_at, closes_at" as any)
      .eq("id", data.session_id).single();
    if (!session) throw new Error("Introuvable");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = session;
    if (!s.results_published_at) return { session, published: false, results: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await supabaseAdmin.from("jury_submissions")
      .select("user_id, score, reasoning_score, copy_quality_score, investigation_score, duration_sec, submitted_at")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("session_id", data.session_id).eq("is_finalized" as any, true)
      .order("score", { ascending: false, nullsFirst: false })
      .order("reasoning_score", { ascending: false, nullsFirst: false })
      .order("copy_quality_score", { ascending: false, nullsFirst: false })
      .order("investigation_score", { ascending: false, nullsFirst: false })
      .order("duration_sec", { ascending: true, nullsFirst: false });
    const rows = (subs ?? []) as Array<{
      user_id: string; score: number;
      reasoning_score: number | null; copy_quality_score: number | null;
      investigation_score: number | null; duration_sec: number | null; submitted_at: string;
    }>;
    const { data: profs } = rows.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, country, kymia_gold_count").in("id", rows.map((r) => r.user_id))
      : { data: [] as Array<{ id: string; display_name: string; country: string | null; kymia_gold_count: number }> };
    return {
      session, published: true,
      results: rows.map((r, i) => {
        const p = (profs ?? []).find((x) => x.id === r.user_id);
        return {
          rank: i + 1, user_id: r.user_id, score: r.score,
          display_name: p?.display_name ?? "Anonyme",
          country: p?.country ?? null,
          reasoning_score: r.reasoning_score,
          copy_quality_score: r.copy_quality_score,
          investigation_score: r.investigation_score,
          duration_sec: r.duration_sec,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          kymia_gold_count: (p as any)?.kymia_gold_count ?? 0,
        };
      }),
    };
  });

// ---------- Dernier vainqueur (bandeau accueil) ----------
export const getLastJuryWinner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: sessions } = await context.supabase.from("jury_sessions" as never)
      .select("id, scheduled_at, winner_user_id, specialty")
      .eq("status", "completed" as never)
      .not("winner_user_id", "is", null)
      .order("scheduled_at", { ascending: false })
      .limit(1);
    const s = (sessions?.[0] as { id: string; scheduled_at: string; winner_user_id: string; specialty: string | null } | undefined) ?? null;
    if (!s) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles")
      .select("display_name, country, kymia_gold_count").eq("id", s.winner_user_id).single();
    return {
      session_id: s.id, scheduled_at: s.scheduled_at, specialty: s.specialty,
      display_name: prof?.display_name ?? "Anonyme",
      country: prof?.country ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kymia_gold_count: (prof as any)?.kymia_gold_count ?? 0,
    };
  });

// ---------- Mes copies (historique) ----------
export const listMyJurySubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("jury_submissions" as never)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, session_id, score, submitted_at, is_finalized, auto_submitted" as any)
      .eq("user_id", context.userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("is_finalized" as any, true)
      .order("submitted_at", { ascending: false });
    const rows = (data ?? []) as Array<{ id: string; session_id: string; score: number; submitted_at: string; auto_submitted: boolean }>;
    if (rows.length === 0) return [];
    const { data: sessions } = await context.supabase.from("jury_sessions" as never)
      .select("id, scheduled_at, specialty, winner_user_id").in("id", rows.map((r) => r.session_id));
    return rows.map((r) => {
      const sx = (sessions ?? []).find((x: { id: string }) => x.id === r.session_id) as { id: string; scheduled_at: string; specialty: string | null; winner_user_id: string | null } | undefined;
      return {
        submission_id: r.id, session_id: r.session_id, score: r.score,
        submitted_at: r.submitted_at, scheduled_at: sx?.scheduled_at ?? null,
        specialty: sx?.specialty ?? null, won: sx?.winner_user_id === context.userId,
        auto_submitted: r.auto_submitted,
      };
    });
  });

// ---------- Détail d'une copie corrigée ----------
export const getMyJurySubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ submission_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: sub } = await context.supabase.from("jury_submissions" as never)
      .select("*").eq("id", data.submission_id).eq("user_id", context.userId).single();
    if (!sub) throw new Error("Copie introuvable");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = sub;
    const { data: session } = await context.supabase.from("jury_sessions" as never)
      .select("*").eq("id", s.session_id).single();
    return { submission: s, session };
  });

// ---------- Mes victoires (profil) ----------
export const getMyJuryWins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase.from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("kymia_gold_count, jury_wins" as any)
      .eq("id", context.userId).single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p: any = prof ?? {};
    return {
      kymia_gold_count: p.kymia_gold_count ?? 0,
      wins: Array.isArray(p.jury_wins) ? (p.jury_wins as Array<{
        session_id: string; scheduled_at: string; week_label: string; specialty: string | null; won_at: string;
      }>) : [],
    };
  });
