import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

async function requireAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc(
    "has_role" as never,
    {
      _user_id: context.userId,
      _role: "admin",
    } as never,
  );
  if (error || data !== true) throw new Error("Accès réservé à l’administration.");
}

export const adminActivityUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ search: z.string().max(120).optional().default("") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: rows, error } = await context.supabase.rpc("admin_activity_users", {
      _search: data.search || undefined,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminSetUserRating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        rating: z.enum(["nul", "moyen", "excellent"]).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const query = data.rating
      ? supabaseAdmin.from("admin_user_assessments").upsert({
          user_id: data.user_id,
          administrator_id: context.userId,
          rating: data.rating,
          updated_at: new Date().toISOString(),
        })
      : supabaseAdmin.from("admin_user_assessments").delete().eq("user_id", data.user_id);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSendUserMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        message: z.string().trim().min(1).max(3000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_user_messages").insert({
      user_id: data.user_id,
      administrator_id: context.userId,
      sender_name: "Dr Kymia Motcho",
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAdminMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("admin_user_messages")
      .select("id, sender_name, message, created_at, read_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markMyAdminMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("admin_user_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
