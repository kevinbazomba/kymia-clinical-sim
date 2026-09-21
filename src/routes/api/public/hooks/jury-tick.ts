import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron minute — pilote du Jury Kymia (édition hebdomadaire 72h).
 * - Assure l'existence de la session courante et prochaine.
 * - Fait passer la session courante en "live" à l'heure d'ouverture.
 * - Auto-finalise les tentatives dont le chrono 45 min est écoulé.
 * - Publie les résultats à la fermeture (Mon 00:00 Kinshasa).
 */
export const Route = createFileRoute("/api/public/hooks/jury-tick")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { editionForDate, publishEdition } = await import("@/lib/jury.functions");

          const now = new Date();
          const summary: Record<string, unknown> = { ensured: null, autoFinalized: [], published: [] };

          // 1) Ensure la session de l'édition courante existe (ou upcoming)
          const edition = editionForDate(now);
          const { data: existing } = await supabaseAdmin.from("jury_sessions")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .select("id, status, closes_at, results_published_at").eq("edition_key" as any, edition.key).maybeSingle();
          if (!existing) {
            // On délègue la création + génération à getCurrentJury lors du 1er accès,
            // mais on tente une pré-création vide pour la stabilité.
            await supabaseAdmin.from("jury_sessions").insert({
              scheduled_at: edition.opensAt.toISOString(), status: "upcoming",
              time_limit_minutes: 45,
              starts_at: edition.opensAt.toISOString(),
              ends_at: edition.closesAt.toISOString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              opens_at: edition.opensAt.toISOString() as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              closes_at: edition.closesAt.toISOString() as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              edition_key: edition.key as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
            summary.ensured = edition.key;
          } else if ((existing as { status: string }).status === "upcoming" && now.getTime() >= edition.opensAt.getTime()) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await supabaseAdmin.from("jury_sessions").update({ status: "live" } as any).eq("id", (existing as { id: string }).id);
          }

          // 2) Auto-finalise les tentatives expirées
          const { data: expired } = await supabaseAdmin.from("jury_submissions")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .select("id, user_id, session_id, draft, transcript, exams, deadline_at" as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .eq("is_finalized" as any, false)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .lt("deadline_at" as any, now.toISOString());
          for (const row of expired ?? []) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const r: any = row;
            try {
              const { finalizeMyJury } = await import("@/lib/jury.functions");
              // On appelle en interne — impossible sans context user. On inline la logique.
              const { data: session } = await supabaseAdmin.from("jury_sessions")
                .select("case_data").eq("id", r.session_id).single();
              const draft = r.draft ?? {};
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const _unused = finalizeMyJury; // silence
              const { gradeAuto } = await import("@/lib/jury-auto");
              const report = await gradeAuto(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session as any)?.case_data ?? {},
                {
                  main: String(draft.main ?? ""),
                  arguments_for: String(draft.arguments_for ?? ""),
                  differentials: String(draft.differentials ?? ""),
                  confirmation_exams: String(draft.confirmation_exams ?? ""),
                  extension_exams: String(draft.extension_exams ?? ""),
                  management: String(draft.management ?? ""),
                  surveillance: String(draft.surveillance ?? ""),
                  followup: String(draft.followup ?? ""),
                },
                String(draft.reasoning_justification ?? ""),
                r.transcript ?? [], r.exams ?? [],
              );
              await supabaseAdmin.from("jury_submissions").update({
                diagnosis: draft, report, score: report.score ?? 0,
                reasoning_justification: String(draft.reasoning_justification ?? ""),
                reasoning_score: report.reasoning_score ?? 0,
                copy_quality_score: report.copy_quality_score ?? 0,
                investigation_score: report.investigation_score ?? 0,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                is_finalized: true as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                auto_submitted: true as any,
                submitted_at: now.toISOString(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any).eq("id", r.id);
              (summary.autoFinalized as string[]).push(r.id);
            } catch (e) {
              console.error("auto-finalize failed", r.id, e);
            }
          }

          // 3) Publie les résultats des sessions dont la fenêtre est close
          const { data: closed } = await supabaseAdmin.from("jury_sessions")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .select("id, closes_at, results_published_at" as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .is("results_published_at" as any, null)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .lt("closes_at" as any, now.toISOString());
          for (const row of closed ?? []) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const id = (row as any).id as string;
            try {
              await publishEdition(id);
              (summary.published as string[]).push(id);
            } catch (e) {
              console.error("publish failed", id, e);
            }
          }

          return Response.json({ ok: true, ts: now.toISOString(), ...summary });
        } catch (e) {
          console.error("jury-tick error", e);
          return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
        }
      },
    },
  },
});
