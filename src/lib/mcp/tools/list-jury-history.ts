import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_jury_history",
  title: "Historique du Jury Kymia",
  description:
    "Liste les copies déposées par l'utilisateur connecté aux sessions du Jury Kymia (mercredi et vendredi 20h). Retourne le score, la date et la session associée.",
  inputSchema: {
    limit: z.number().int().default(20).describe("Nombre maximum de copies (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const cap = Math.max(1, Math.min(100, limit));
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("jury_submissions")
      .select("id, session_id, score, submitted_at")
      .eq("user_id", ctx.getUserId())
      .order("submitted_at", { ascending: false })
      .limit(cap);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { submissions: data ?? [] },
    };
  },
});
