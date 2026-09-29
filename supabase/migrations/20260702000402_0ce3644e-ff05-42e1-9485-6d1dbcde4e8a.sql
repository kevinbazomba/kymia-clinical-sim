
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS profession text,
  ADD COLUMN IF NOT EXISTS kymia_gold_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.is_subscription_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND status IN ('active','free')
      AND (expires_at IS NULL OR expires_at > now())
  ) OR public.has_role(_user_id, 'admin');
$$;

DROP FUNCTION IF EXISTS public.admin_list_users(text, integer);
CREATE FUNCTION public.admin_list_users(_search text DEFAULT NULL, _limit integer DEFAULT 100)
RETURNS TABLE(id uuid, email text, display_name text, level text, country text,
              whatsapp text, profession text, kymia_gold_count integer,
              total_score integer, consultations_count integer,
              created_at timestamp with time zone,
              sub_status text, sub_plan text, sub_expires_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text, p.display_name, p.level, p.country,
         p.whatsapp, p.profession, COALESCE(p.kymia_gold_count, 0),
         p.total_score, p.consultations_count, p.created_at,
         s.status, s.plan, s.expires_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT status, plan, expires_at FROM public.subscriptions
    WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
  ) s ON TRUE
  WHERE public.has_role(auth.uid(), 'admin')
    AND (_search IS NULL OR _search = ''
         OR u.email ILIKE '%' || _search || '%'
         OR p.display_name ILIKE '%' || _search || '%')
  ORDER BY u.created_at DESC
  LIMIT COALESCE(_limit, 100);
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2()
RETURNS TABLE(id uuid, display_name text, country text, avg_score numeric,
              consultations_count integer, total_score integer, kymia_gold_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.country,
         CASE WHEN p.consultations_count > 0
              THEN ROUND((p.total_score::numeric / p.consultations_count::numeric), 1)
              ELSE 0 END AS avg_score,
         p.consultations_count, p.total_score, COALESCE(p.kymia_gold_count, 0)
  FROM public.profiles p
  WHERE p.consultations_count > 0
  ORDER BY avg_score DESC, p.consultations_count DESC
  LIMIT 50;
$$;

CREATE TABLE IF NOT EXISTS public.jury_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_at timestamp with time zone NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  specialty text,
  case_data jsonb,
  status text NOT NULL DEFAULT 'upcoming',
  winner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  time_limit_minutes integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jury_sessions TO authenticated, anon;
GRANT ALL ON public.jury_sessions TO service_role;
ALTER TABLE public.jury_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jury sessions readable by all" ON public.jury_sessions;
CREATE POLICY "jury sessions readable by all" ON public.jury_sessions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.jury_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.jury_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reserved_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.jury_participants TO authenticated;
GRANT ALL ON public.jury_participants TO service_role;
ALTER TABLE public.jury_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "participants readable" ON public.jury_participants;
DROP POLICY IF EXISTS "reserve own seat" ON public.jury_participants;
DROP POLICY IF EXISTS "cancel own seat" ON public.jury_participants;
CREATE POLICY "participants readable" ON public.jury_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "reserve own seat" ON public.jury_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cancel own seat" ON public.jury_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.jury_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.jury_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diagnosis jsonb NOT NULL,
  report jsonb,
  score integer,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT, INSERT ON public.jury_submissions TO authenticated;
GRANT ALL ON public.jury_submissions TO service_role;
ALTER TABLE public.jury_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submissions readable by all authed" ON public.jury_submissions;
DROP POLICY IF EXISTS "submit own" ON public.jury_submissions;
CREATE POLICY "submissions readable by all authed" ON public.jury_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "submit own" ON public.jury_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
