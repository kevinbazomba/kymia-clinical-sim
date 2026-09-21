
-- 1) SUPPRESSION SALLE DE GARDE
DROP FUNCTION IF EXISTS public.community_feed(text, text, integer, boolean);
DROP FUNCTION IF EXISTS public.community_user_badges(uuid);
DROP TABLE IF EXISTS public.community_saves CASCADE;
DROP TABLE IF EXISTS public.community_likes CASCADE;
DROP TABLE IF EXISTS public.community_comments CASCADE;
DROP TABLE IF EXISTS public.community_posts CASCADE;

-- 2) REFONTE JURY : fenêtre hebdomadaire 72h + chrono per-utilisateur 45 min
ALTER TABLE public.jury_sessions
  ADD COLUMN IF NOT EXISTS opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS results_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS edition_key text;
CREATE UNIQUE INDEX IF NOT EXISTS jury_sessions_edition_key_uidx
  ON public.jury_sessions(edition_key) WHERE edition_key IS NOT NULL;

ALTER TABLE public.jury_submissions
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_finalized boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reasoning_justification text,
  ADD COLUMN IF NOT EXISTS draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exams jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.jury_submissions ALTER COLUMN submitted_at DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS jury_submissions_user_session_uidx
  ON public.jury_submissions(session_id, user_id);

-- 3) PUSH SUBSCRIPTIONS (schéma seul — envoi géré ultérieurement)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_own_select" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_own_insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_own_delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
