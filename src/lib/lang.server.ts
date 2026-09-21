/** Server-only helpers to keep AI-generated content in the user's language. */
export type AiLang = "fr" | "en";

export function normalizeLang(value: unknown): AiLang {
  return value === "en" ? "en" : "fr";
}

/** Reads the language preference stored on the user's profile. */
export async function fetchUserLang(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<AiLang> {
  try {
    const { data } = await supabase.from("profiles").select("language").eq("id", userId).single();
    return normalizeLang(data?.language);
  } catch {
    return "fr";
  }
}

/**
 * Hard language directive appended to every AI prompt.
 * The model must never answer in the other language.
 */
export function langDirective(lang: AiLang): string {
  if (lang === "en") {
    return `

=== OUTPUT LANGUAGE: ENGLISH (MANDATORY) ===
Write ABSOLUTELY EVERYTHING you output in English: patient speech, names of findings, lab/imaging report wording, clinical reasoning, teaching content, feedback, advice and every JSON string value. Use standard international medical English terminology. Never answer in French, even if the surrounding instructions are written in French — the only exception is if the learner explicitly asks you, in their own message, to answer in French.
Patient first names may stay culturally African, but everything else is English.`;
  }
  return `

=== LANGUE DE SORTIE : FRANÇAIS (OBLIGATOIRE) ===
Rédige absolument TOUT en français : paroles du patient, résultats d'examens, raisonnement, cours, correction, conseils et toutes les valeurs de chaînes JSON. N'utilise jamais l'anglais, sauf si l'apprenant demande explicitement une réponse en anglais dans son propre message.`;
}

/** Fixed labels injected in prompts that mix roles into a transcript. */
export function transcriptLabels(lang: AiLang) {
  return lang === "en"
    ? { doctor: "Doctor", patient: "Patient", student: "Student", none: "(none)" }
    : { doctor: "Médecin", patient: "Patient", student: "Étudiant", none: "(aucun)" };
}
