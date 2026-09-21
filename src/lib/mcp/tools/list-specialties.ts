import { defineTool } from "@lovable.dev/mcp-js";

const SPECIALTIES = [
  { id: "medecine_interne", label: "Médecine interne" },
  { id: "chirurgie", label: "Chirurgie" },
  { id: "pediatrie", label: "Pédiatrie" },
  { id: "gyneco_obst", label: "Gynécologie et obstétrique" },
  { id: "psychiatrie", label: "Psychiatrie" },
  { id: "urgences", label: "Médecine d'urgence" },
];

export default defineTool({
  name: "list_specialties",
  title: "Lister les spécialités Kymia",
  description:
    "Renvoie la liste des spécialités cliniques proposées par Kymia pour lancer une consultation simulée.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(SPECIALTIES, null, 2) }],
    structuredContent: { specialties: SPECIALTIES },
  }),
});
