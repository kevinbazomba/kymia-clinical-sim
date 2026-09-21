import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role" as never, {
    _user_id: context.userId,
    _role: "admin",
  } as never);
  if (error) throw new Error("Vérification admin impossible");
  if (!data) throw new Error("Accès refusé : privilèges administrateur requis");
}

// ---------- Am I admin? ----------
export const checkAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role" as never, {
      _user_id: context.userId,
      _role: "admin",
    } as never);
    return { isAdmin: Boolean(data) };
  });

// ---------- Platform stats ----------
export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase.rpc("admin_platform_stats" as never);
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? {}) as any;
  });

// ---------- List / search users ----------
export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ search: z.string().max(120).optional().default("") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: rows, error } = await context.supabase.rpc("admin_list_users" as never, {
      _search: data.search || null,
      _limit: 200,
    } as never);
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((rows ?? []) as any[]).map((r) => ({
      id: r.id as string,
      email: (r.email ?? "") as string,
      display_name: (r.display_name ?? null) as string | null,
      level: (r.level ?? null) as string | null,
      country: (r.country ?? null) as string | null,
      whatsapp: (r.whatsapp ?? null) as string | null,
      profession: (r.profession ?? null) as string | null,
      total_score: (r.total_score ?? 0) as number,
      consultations_count: (r.consultations_count ?? 0) as number,
      free_trial_used: (r.free_trial_used ?? 0) as number,
      is_suspended: Boolean(r.is_suspended),
      created_at: r.created_at as string,
      last_sign_in_at: (r.last_sign_in_at ?? null) as string | null,
      sub_status: (r.sub_status ?? null) as string | null,
      sub_plan: (r.sub_plan ?? null) as string | null,
      sub_expires_at: (r.sub_expires_at ?? null) as string | null,
    }));
  });

// ---------- Activate or extend a subscription ----------
export const adminUpsertSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      plan: z.string().min(1).max(40).default("standard"),
      months: z.number().int().min(1).max(60).default(1),
      status: z.enum(["active", "suspended", "expired", "free"]).default("active"),
      notes: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id, expires_at")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();
    const base = existing?.expires_at && new Date(existing.expires_at) > now
      ? new Date(existing.expires_at)
      : now;
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + data.months);

    if (existing) {
      const { error } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: data.plan,
          status: data.status,
          expires_at: newExpiry.toISOString(),
          notes: data.notes ?? null,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("subscriptions").insert({
        user_id: data.user_id,
        plan: data.plan,
        status: data.status,
        expires_at: newExpiry.toISOString(),
        notes: data.notes ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true, expires_at: newExpiry.toISOString() };
  });

// ---------- Suspend a subscription ----------
export const adminSuspendSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({ status: "suspended" })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Delete a user (irreversible) ----------
export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), confirm: z.literal("DELETE") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.user_id === context.userId) throw new Error("Vous ne pouvez pas supprimer votre propre compte administrateur");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Suspend / unsuspend an account (moderation) ----------
export const adminSetUserSuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), suspended: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabaseAdmin.from("profiles")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ is_suspended: data.suspended } as any).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Diversité des cas cliniques générés ----------
export const adminCaseDiversity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ specialty: z.string().max(60).optional().default("") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: rows, error } = await context.supabase.rpc("admin_case_diversity" as never, {
      _specialty: data.specialty || null,
    } as never);
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((rows ?? []) as any[]).map((r) => ({
      specialty: (r.specialty ?? "") as string,
      subspecialty: (r.subspecialty ?? "") as string,
      pathology_key: (r.pathology_key ?? "") as string,
      pathology_label: (r.pathology_label ?? "") as string,
      times_generated: Number(r.times_generated ?? 0),
      last_seen: (r.last_seen ?? null) as string | null,
      share: r.share == null ? 0 : Number(r.share),
    }));
  });
