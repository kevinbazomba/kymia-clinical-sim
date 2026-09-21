/**
 * Central server-only configuration.
 *
 * Edit values in `.env` locally, or in the host's environment-variable panel
 * when deployed. Never prefix secret values with `VITE_`.
 */
function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} manquant dans les variables d'environnement`);
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function positiveInteger(name: string, fallback: number): number {
  const value = optional(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} doit être un nombre entier positif ou nul`);
  }
  return parsed;
}

export type AiAuthType = "bearer" | "lovable" | "none";

function getAiAuthType(baseUrl: string): AiAuthType {
  const configured = optional("AI_AUTH_TYPE");
  if (configured === "bearer" || configured === "lovable" || configured === "none") return configured;
  return baseUrl.includes("lovable.dev") ? "lovable" : "bearer";
}

export function getAiConfig() {
  const gatewayUrl = optional("AI_BASE_URL") ?? optional("LOVABLE_AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev/v1";
  const authType = getAiAuthType(gatewayUrl);
  const apiKey = optional("AI_API_KEY") ?? optional("LOVABLE_API_KEY");

  if (authType !== "none" && !apiKey) {
    throw new Error("AI_API_KEY manquant dans les variables d'environnement");
  }

  return {
    provider: optional("AI_PROVIDER") ?? "openai-compatible",
    apiKey,
    gatewayUrl,
    authType,
    model: optional("AI_MODEL") ?? optional("LOVABLE_AI_MODEL") ?? "google/gemini-3-flash-preview",
  };
}

export function getAppLimits() {
  return {
    freeTrialLimit: positiveInteger("FREE_TRIAL_LIMIT", 2),
  };
}

export function getSupabasePublicConfig() {
  return {
    url: required("SUPABASE_URL"),
    publishableKey: required("SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function getSupabaseAdminConfig() {
  return {
    url: required("SUPABASE_URL"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
