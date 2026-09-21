/**
 * Central public configuration.
 *
 * Edit values in `.env`, never here. Only `VITE_*` values belong in this file:
 * Vite makes them available in the browser.
 */
export const publicConfig = {
  supabase: {
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "",
    url: import.meta.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    publishableKey:
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "",
  },
} as const;
