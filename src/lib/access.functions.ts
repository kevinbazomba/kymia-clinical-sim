import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAppLimits } from "@/lib/app-config.server";

// Centralized subscription/access status.
// One and only one status per user is derived server-side. UI must not bypass this.
export type AccessStatus =
  | "admin"
  | "active"          // paid subscription active + not expired
  | "free"            // GRATUIT/OFFERT — admin granted, same rights as active
  | "trial"           // new user, still under 2 free consultations
  | "trial_exhausted" // used all 2 free consultations, no subscription
  | "suspended"       // subscription set to suspended by admin
  | "expired"         // subscription expired or explicitly expired status
  | "account_suspended"; // profile.is_suspended (moderation)

export interface AccessInfo {
  status: AccessStatus;
  can_consult: boolean;
  can_jury: boolean;
  free_trial_used: number;
  free_trial_limit: number;
  sub_status: string | null;
  sub_expires_at: string | null;
}

// Change FREE_TRIAL_LIMIT in .env, then restart the development server.
export const FREE_TRIAL_LIMIT = getAppLimits().freeTrialLimit;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeAccess(context: any): Promise<AccessInfo> {
  // Admin bypass
  const { data: admin } = await context.supabase.rpc("has_role" as never, {
    _user_id: context.userId, _role: "admin",
  } as never);
  if (admin === true) {
    return { status: "admin", can_consult: true, can_jury: true,
      free_trial_used: 0, free_trial_limit: FREE_TRIAL_LIMIT,
      sub_status: null, sub_expires_at: null };
  }

  const { data: prof } = await context.supabase
    .from("profiles").select("free_trial_used, is_suspended")
    .eq("id", context.userId).single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = prof ?? {};
  if (p.is_suspended === true) {
    return { status: "account_suspended", can_consult: false, can_jury: false,
      free_trial_used: p.free_trial_used ?? 0, free_trial_limit: FREE_TRIAL_LIMIT,
      sub_status: null, sub_expires_at: null };
  }

  const { data: sub } = await context.supabase
    .from("subscriptions").select("status, expires_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = sub ?? null;
  const used = (p.free_trial_used ?? 0) as number;
  const base = { free_trial_used: used, free_trial_limit: FREE_TRIAL_LIMIT,
    sub_status: s?.status ?? null, sub_expires_at: s?.expires_at ?? null };

  if (s) {
    const expiredByDate = s.expires_at && new Date(s.expires_at) <= new Date();
    if (s.status === "suspended")
      return { ...base, status: "suspended", can_consult: false, can_jury: false };
    if (s.status === "expired" || expiredByDate)
      return { ...base, status: "expired", can_consult: false, can_jury: false };
    if (s.status === "active")
      return { ...base, status: "active", can_consult: true, can_jury: true };
    if (s.status === "free")
      return { ...base, status: "free", can_consult: true, can_jury: true };
  }

  // No subscription → free trial gate
  if (used >= FREE_TRIAL_LIMIT)
    return { ...base, status: "trial_exhausted", can_consult: false, can_jury: false };
  return { ...base, status: "trial", can_consult: true, can_jury: true };
}

// Throws a machine-readable error code when the user cannot consult / reserve.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function assertCanConsult(context: any, opts?: { incrementTrial?: boolean }) {
  const access = await computeAccess(context);
  if (access.can_consult) {
    if (access.status === "trial" && opts?.incrementTrial) {
      await context.supabase.from("profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ free_trial_used: access.free_trial_used + 1 } as any)
        .eq("id", context.userId);
    }
    return access;
  }
  const code =
    access.status === "suspended" ? "SUBSCRIPTION_SUSPENDED"
    : access.status === "expired" ? "SUBSCRIPTION_EXPIRED"
    : access.status === "trial_exhausted" ? "FREE_TRIAL_EXHAUSTED"
    : access.status === "account_suspended" ? "ACCOUNT_SUSPENDED"
    : "ACCESS_DENIED";
  throw new Error(code);
}

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => computeAccess(context));
