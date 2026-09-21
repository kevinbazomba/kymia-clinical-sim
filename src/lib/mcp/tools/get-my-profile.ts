import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_profile",
  title: "Mon profil Kymia",
  description:
    "Retourne le profil Kymia de l'utilisateur connecté : nom affiché, pays, profession, score total, nombre de consultations et badges Kymia Gold.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié." }], isError: true };
    }
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("profiles")
      .select(
        "id, display_name, country, profession, level, total_score, consultations_count, kymia_gold_count, free_trial_used, created_at",
      )
      .eq("id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? {}, null, 2) }],
      structuredContent: { profile: data ?? null, email: ctx.getUserEmail() ?? null },
    };
  },
});
