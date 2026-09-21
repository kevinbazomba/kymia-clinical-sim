import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Reads the language preference saved on the user's profile. */
export const getMyLanguage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("language")
      .eq("id", context.userId)
      .single();
    const raw = (data as { language?: string } | null)?.language;
    return { language: raw === "en" ? "en" : "fr" } as { language: "fr" | "en" };
  });

/** Persists the language preference. Never touches any other user data. */
export const setMyLanguage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ language: z.enum(["fr", "en"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ language: data.language } as never)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, language: data.language };
  });
