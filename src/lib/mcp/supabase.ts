import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import { getSupabasePublicConfig } from "@/lib/app-config.server";

// Server-only helper. RLS runs as the authenticated user because we forward
// the caller's verified access token to the Data API.
export function supabaseForUser(ctx: ToolContext) {
  const { url, publishableKey: key } = getSupabasePublicConfig();
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
