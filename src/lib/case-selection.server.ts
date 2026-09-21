/**
 * Moteur de sélection et de diversification des cas cliniques KYMIA.
 * Sélectionne une pathologie cible en croisant :
 *  - la banque de pathologies (pertinence clinique + réalités africaines)
 *  - l'historique personnel de l'utilisateur (anti-répétition)
 *  - l'usage global de la plateforme (rotation)
 * puis fixe l'angle de présentation, la démographie, le contexte et la difficulté.
 */
import {
  getBank, PRESENTATION_ANGLES, AGE_BANDS, AFRICAN_CONTEXTS,
  INTERNE_BANK, type PathologyEntry, type Difficulty,
} from "@/lib/pathology-bank";

export interface PriorCase {
  pathology_key: string;
  pathology_label: string;
  subspecialty: string | null;
  diagnosis: string | null;
  chief_complaint: string | null;
  age: number | null;
  sex: string | null;
  difficulty: string | null;
  created_at: string;
}

export interface CasePlan {
  pathology: PathologyEntry;
  subspecialty: string | null;
  angle: string;
  ageBandLabel: string;
  ageMin: number;
  ageMax: number;
  sex: "M" | "F";
  pregnancy: boolean;
  difficulty: Difficulty;
  context: string;
  avoid: string[];
  nearMiss: boolean;
}

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function weightedPick<T>(items: { item: T; score: number }[]): T {
  const total = items.reduce((s, i) => s + Math.max(i.score, 0.0001), 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= Math.max(i.score, 0.0001);
    if (r <= 0) return i.item;
  }
  return items[items.length - 1].item;
}

/** Pénalité liée à l'historique personnel : plus le cas est récent, plus la pathologie est évitée. */
function userPenalty(key: string, recent: PriorCase[]): number {
  const idx = recent.findIndex((c) => c.pathology_key === key);
  if (idx === -1) return 1;
  if (idx === 0) return 0.01;
  if (idx < 3) return 0.03;
  if (idx < 6) return 0.08;
  if (idx < 12) return 0.25;
  if (idx < 20) return 0.55;
  return 0.85;
}

/** Pénalité liée à l'usage global : favorise les pathologies encore peu exploitées. */
function globalPenalty(key: string, usage: Map<string, number>, avgUses: number): number {
  const uses = usage.get(key) ?? 0;
  if (avgUses <= 0) return 1;
  return 1 / (1 + Math.max(0, uses - avgUses) / Math.max(1, avgUses));
}

/** Rotation des sous-spécialités de médecine interne (répartition équilibrée par utilisateur). */
function pickSubspecialty(recent: PriorCase[]): string {
  const keys = Object.keys(INTERNE_BANK);
  const counts = new Map<string, number>(keys.map((k) => [k, 0]));
  recent.slice(0, 20).forEach((c, i) => {
    const k = (c.subspecialty ?? "").toLowerCase();
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + (i < 6 ? 3 : 1));
  });
  const scored = keys.map((k) => ({ item: k, score: 1 / (1 + (counts.get(k) ?? 0)) ** 2 }));
  return weightedPick(scored);
}

/** Difficulté progressive selon l'expérience de l'utilisateur. */
function pickDifficulty(totalCases: number): Difficulty {
  const table: [Difficulty, number][] =
    totalCases < 5 ? [["facile", 6], ["intermédiaire", 3], ["difficile", 1]]
    : totalCases < 15 ? [["facile", 3], ["intermédiaire", 5], ["difficile", 2]]
    : totalCases < 30 ? [["facile", 2], ["intermédiaire", 5], ["difficile", 3]]
    : [["facile", 1], ["intermédiaire", 4], ["difficile", 5]];
  return weightedPick(table.map(([item, score]) => ({ item, score })));
}

/** Contraintes de cohérence imposées par la pathologie elle-même. */
export function pathologyConstraints(label: string): { sex?: "M" | "F"; bandKeys?: string[] } {
  const l = label.toLowerCase();
  const out: { sex?: "M" | "F"; bandKeys?: string[] } = {};
  if (/sein|utér|uter|col de l|grossesse|post-partum|péripartum|peripartum|obstétric|obstetric|ménopause|menopause|gynéco|gyneco|éclampsie|eclampsie|placenta|avortement|fistule vésico|salpingite|dystocie|puerpérale|puerperale|rupture utérine/.test(l)) out.sex = "F";
  if (/prostate|testicule|hbp/.test(l)) out.sex = "M";
  if (/néonat|neonat|nouveau-né/.test(l)) out.bandKeys = ["nouveau_ne"];
  else if (/nourrisson|bronchiolite/.test(l)) out.bandKeys = ["nourrisson"];
  else if (/rétinoblastome|retinoblastome|rougeole|convulsions fébriles|grand enfant|kwashiorkor/.test(l)) out.bandKeys = ["nourrisson", "enfant", "adolescent"];
  else if (/de l'enfant|pédiatrique|pediatrique/.test(l)) out.bandKeys = ["nourrisson", "enfant", "adolescent"];
  else if (/sujet âgé|sujet age|personne âgée|démence|demence|parkinson|arthrose|hbp/.test(l)) out.bandKeys = ["adulte", "age"];
  return out;
}

function pickAgeBand(pathology: PathologyEntry, specialty: string, recent: PriorCase[]) {
  let bands = AGE_BANDS;
  if (specialty === "pediatrie") bands = AGE_BANDS.filter((b) => b.max <= 17);
  else if (specialty === "gynecologie") bands = AGE_BANDS.filter((b) => b.min >= 12 && b.min < 60);
  else bands = AGE_BANDS.filter((b) => b.min >= 12);

  const forced = pathologyConstraints(pathology.label).bandKeys;
  if (forced) {
    const restricted = AGE_BANDS.filter((b) => forced.includes(b.key));
    if (restricted.length) bands = restricted;
  }
  if (!bands.length) bands = AGE_BANDS;

  // éviter la tranche d'âge des 2 derniers cas quand c'est possible
  const recentAges = recent.slice(0, 2).map((c) => c.age ?? -1);
  const scored = bands.map((b) => ({
    item: b,
    score: recentAges.some((a) => a >= b.min && a <= b.max) ? 0.3 : 1,
  }));
  return weightedPick(scored);
}

export async function planCase(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  userId: string;
  specialty: string;
  subspecialty?: string | null;
}): Promise<CasePlan> {
  const { supabase, userId, specialty } = opts;

  // 1) historique personnel
  let recent: PriorCase[] = [];
  try {
    const { data } = await supabase
      .from("case_registry")
      .select("pathology_key,pathology_label,subspecialty,diagnosis,chief_complaint,age,sex,difficulty,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);
    recent = (data ?? []) as PriorCase[];
  } catch { /* historique indisponible : on continue sans */ }

  const recentInSpec = recent.filter((c) => true); // toutes spécialités pour la démographie
  const subspecialty =
    opts.subspecialty ??
    (specialty === "medecine_interne"
      ? pickSubspecialty(recent.filter((c) => c.subspecialty))
      : null);

  const bank = getBank(specialty, subspecialty);
  const recentSameBank = recent.filter((c) => bank.some((b) => b.key === c.pathology_key));

  // 2) usage global (rotation plateforme)
  const usage = new Map<string, number>();
  try {
    const { data } = await supabase.rpc("global_pathology_usage", {
      _specialty: specialty,
      _subspecialty: subspecialty,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((data ?? []) as any[]).forEach((r) => usage.set(r.pathology_key as string, Number(r.uses) || 0));
  } catch { /* rotation globale optionnelle */ }
  const totalUses = [...usage.values()].reduce((a, b) => a + b, 0);
  const avgUses = totalUses / Math.max(1, bank.length);

  // 3) cas « sensiblement similaire » : occasionnel (18 %), à visée pédagogique
  const lastCase = recentSameBank[0];
  const lastEntry = lastCase ? bank.find((b) => b.key === lastCase.pathology_key) : undefined;
  const wantNearMiss = Boolean(lastEntry) && Math.random() < 0.18;

  let candidates = bank;
  if (wantNearMiss && lastEntry) {
    const sameFamily = bank.filter(
      (b) => b.key !== lastEntry.key && b.families.some((f) => lastEntry.families.includes(f)),
    );
    if (sameFamily.length >= 2) candidates = sameFamily;
  }

  const scored = candidates.map((item) => ({
    item,
    score:
      item.weight *
      userPenalty(item.key, recentSameBank) *
      globalPenalty(item.key, usage, avgUses) *
      (0.75 + Math.random() * 0.5),
  }));
  const pathology = weightedPick(scored);

  // 4) présentation, démographie, contexte, difficulté
  const band = pickAgeBand(pathology, specialty, recentInSpec);
  const age = band.min === band.max ? band.min : band.min + Math.floor(Math.random() * (band.max - band.min + 1));

  const constraints = pathologyConstraints(pathology.label);
  let sex: "M" | "F" = Math.random() < 0.5 ? "M" : "F";
  const lastSexes = recent.slice(0, 2).map((c) => c.sex);
  if (lastSexes.length === 2 && lastSexes[0] === lastSexes[1] && lastSexes[0]) {
    sex = lastSexes[0] === "F" ? "M" : "F";
  }
  if (specialty === "gynecologie") sex = "F";
  if (constraints.sex) sex = constraints.sex;

  const pregnancy =
    sex === "F" && age >= 16 && age <= 44 &&
    (specialty === "gynecologie" ? Math.random() < 0.7 : Math.random() < 0.12);

  const totalCases = recent.length;

  return {
    pathology,
    subspecialty,
    angle: rand(PRESENTATION_ANGLES),
    ageBandLabel: band.label,
    ageMin: band.min,
    ageMax: band.max,
    sex,
    pregnancy,
    difficulty: pickDifficulty(totalCases),
    context: rand(AFRICAN_CONTEXTS),
    avoid: recentSameBank.slice(0, 12).map((c) => c.pathology_label || c.pathology_key),
    nearMiss: wantNearMiss,
  };
}

// ---------- Contrôle de similarité ----------
const STOP = new Set(["de", "du", "des", "la", "le", "les", "un", "une", "et", "a", "au", "aux", "sur", "avec", "par", "chez", "en", "d", "l"]);

function tokens(s: string): Set<string> {
  return new Set(
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((t) => { if (b.has(t)) inter++; });
  return inter / (a.size + b.size - inter);
}

/** Score de similarité 0..1 entre un cas généré et un cas déjà rencontré. */
export function similarityScore(
  candidate: { diagnosis: string; chief_complaint: string; age: number; sex: string },
  prior: PriorCase,
): number {
  const dx = jaccard(tokens(candidate.diagnosis), tokens(prior.diagnosis ?? ""));
  const cc = jaccard(tokens(candidate.chief_complaint), tokens(prior.chief_complaint ?? ""));
  const sameSex = candidate.sex === prior.sex ? 1 : 0;
  const ageClose = prior.age != null && Math.abs(candidate.age - prior.age) <= 7 ? 1 : 0;
  return Math.min(1, dx * 0.6 + cc * 0.25 + sameSex * 0.05 + ageClose * 0.1);
}

/** Le cas est-il trop proche d'un cas récent de l'utilisateur ? */
export function isTooSimilar(
  candidate: { diagnosis: string; chief_complaint: string; age: number; sex: string },
  recent: PriorCase[],
  threshold = 0.55,
): { similar: boolean; worst: number } {
  let worst = 0;
  for (const prior of recent.slice(0, 15)) {
    worst = Math.max(worst, similarityScore(candidate, prior));
  }
  return { similar: worst >= threshold, worst };
}

/** Historique récent de l'utilisateur (utilisé pour le contrôle de similarité). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchRecentCases(supabase: any, userId: string, limit = 20): Promise<PriorCase[]> {
  try {
    const { data } = await supabase
      .from("case_registry")
      .select("pathology_key,pathology_label,subspecialty,diagnosis,chief_complaint,age,sex,difficulty,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as PriorCase[];
  } catch {
    return [];
  }
}
