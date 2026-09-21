-- 1) Sessions du Jury : lecture réservée aux utilisateurs connectés
DROP POLICY IF EXISTS "jury sessions readable by all" ON public.jury_sessions;

CREATE POLICY "jury sessions readable by authenticated"
ON public.jury_sessions
FOR SELECT
TO authenticated
USING (true);

-- 2) Le contenu du cas (case_data) ne doit jamais transiter par la Data API :
--    il est uniquement lu/écrit par le serveur (service_role).
REVOKE SELECT ON public.jury_sessions FROM anon;
REVOKE SELECT ON public.jury_sessions FROM authenticated;

GRANT SELECT (
  id,
  scheduled_at,
  starts_at,
  ends_at,
  specialty,
  status,
  winner_user_id,
  time_limit_minutes,
  created_at,
  updated_at,
  opens_at,
  closes_at,
  results_published_at,
  edition_key
) ON public.jury_sessions TO authenticated;

GRANT ALL ON public.jury_sessions TO service_role;