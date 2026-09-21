// Grading helper réutilisé par le cron d'auto-finalisation.
// (Séparé du fichier .functions pour éviter les imports transitifs client → server.)

import { generateText } from "ai";
import { createLovableAiGatewayProvider, getDefaultAiModel } from "@/lib/ai-gateway.server";

export async function gradeAuto(
  caseData: Record<string, unknown>,
  diagnosis: Record<string, string>,
  reasoning: string,
  transcript: unknown[],
  exams: unknown[],
) {
  const gateway = createLovableAiGatewayProvider();
  const model = gateway(getDefaultAiModel());
  const prompt = `Kymia Motcho — auto-correction (temps écoulé, copie possiblement incomplète). Note sévère /100.
Cas : diag ${caseData.hidden_diagnosis} · patho ${caseData.hidden_pathophysiology} · attendus ${(caseData.expected_exams as string[] | undefined)?.join(" ; ")} · PEC ${caseData.expected_management}.
Interrogatoire (${transcript.length}) : ${JSON.stringify(transcript).slice(0, 3000)}
Investigations (${exams.length}) : ${JSON.stringify(exams).slice(0, 3000)}
Copie : ${JSON.stringify(diagnosis).slice(0, 3000)}
Raisonnement : ${reasoning}
Réponds JSON strict avec keys: score, reasoning_score, copy_quality_score, investigation_score, criteria (11 sous-notes), answer_analysis, correct_points[], errors[], unnecessary_exams[], missed_exams[], expected_approach, final_diagnosis, differentials, confirmation_exams, extension_exams, management, pathophysiology, semiology, references[], expert_answer, signed_by:"Kymia Motcho".`;
  const { text } = await generateText({ model, prompt, temperature: 0.2 });
  const raw = text.trim();
  const s = raw.indexOf("{"); const e = raw.lastIndexOf("}");
  return JSON.parse(raw.slice(s, e + 1));
}
