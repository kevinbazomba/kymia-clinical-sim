import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listConsultations from "./tools/list-consultations";
import getConsultation from "./tools/get-consultation";
import getMyProfile from "./tools/get-my-profile";
import listJuryHistory from "./tools/list-jury-history";
import listSpecialties from "./tools/list-specialties";
import { publicConfig } from "@/lib/app-config";

const projectRef = publicConfig.supabase.projectId || "project-ref-unset";

export default defineMcp({
  name: "kymia-mcp",
  title: "Kymia — Simulateur clinique",
  version: "0.1.0",
  instructions:
    "Kymia est une plateforme de simulation clinique alimentée par l'IA. Ces outils permettent à un utilisateur connecté de consulter ses propres consultations simulées, ses rapports de correction, son profil et son historique du Jury Kymia. Toutes les données sont limitées à l'utilisateur authentifié.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listSpecialties,
    listConsultations,
    getConsultation,
    getMyProfile,
    listJuryHistory,
  ],
});
