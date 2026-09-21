import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_consultations",
  title: "Mes consultations",
  description:
    "Liste les consultations simulées de l'utilisateur connecté (les plus récentes d'abord). Retourne l'id, la spécialité, le cycle, le statut, le score et la date.",
  inputSchema: {
    status: z
      .enum(["in_progress", "completed", "any"])
      .default("any")
      .describe("Filtrer par statut."),
    limit: z.number().int().default(20).describe("Nombre maximum de consultations (1-100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const cap = Math.max(1, Math.min(100, limit));
    const sb = supabaseForUser(ctx);
    let q = sb
      .from("consultations")
      .select("id, specialty, subspecialty, cycle, status, score, created_at, completed_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(cap);
    if (status !== "any") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { consultations: data ?? [] },
    };
  },
});
