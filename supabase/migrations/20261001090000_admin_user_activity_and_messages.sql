CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_presence FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;
CREATE POLICY "users manage own presence" ON public.user_presence
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.admin_user_assessments (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('nul', 'moyen', 'excellent')),
  administrator_id uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_user_assessments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_user_assessments FROM anon, authenticated;
GRANT ALL ON public.admin_user_assessments TO service_role;

CREATE TABLE IF NOT EXISTS public.admin_user_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  administrator_id uuid NOT NULL REFERENCES auth.users(id),
  sender_name text NOT NULL DEFAULT 'Dr Kymia Motcho',
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS admin_user_messages_user_created_idx
  ON public.admin_user_messages (user_id, created_at DESC);
ALTER TABLE public.admin_user_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_user_messages FROM anon, authenticated;
GRANT SELECT ON public.admin_user_messages TO authenticated;
GRANT UPDATE (read_at) ON public.admin_user_messages TO authenticated;
GRANT ALL ON public.admin_user_messages TO service_role;
CREATE POLICY "users read own admin messages" ON public.admin_user_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users mark own admin messages read" ON public.admin_user_messages
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.admin_activity_users(_search text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  profession text,
  country text,
  sub_status text,
  sub_expires_at timestamptz,
  last_seen_at timestamptz,
  is_online boolean,
  consultations_24h integer,
  consultations_30d integer,
  consultations_total integer,
  completed_30d integer,
  average_score_30d numeric,
  rating text,
  rating_updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH active_users AS (
    SELECT u.id, u.email::text, p.display_name, p.profession, p.country,
           s.status AS sub_status, s.expires_at AS sub_expires_at
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    JOIN LATERAL (
      SELECT status, expires_at FROM public.subscriptions
      WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
    ) s ON true
    WHERE (s.status IN ('active', 'free'))
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND (_search IS NULL OR _search = '' OR u.email ILIKE '%' || _search || '%'
           OR p.display_name ILIKE '%' || _search || '%')
  )
  SELECT a.id, a.email, a.display_name, a.profession, a.country,
         a.sub_status, a.sub_expires_at, pr.last_seen_at,
         COALESCE(pr.last_seen_at >= now() - interval '2 minutes', false) AS is_online,
         COALESCE(c.consultations_24h, 0)::integer,
         COALESCE(c.consultations_30d, 0)::integer,
         COALESCE(c.consultations_total, 0)::integer,
         COALESCE(c.completed_30d, 0)::integer,
         c.average_score_30d,
         r.rating, r.updated_at
  FROM active_users a
  LEFT JOIN public.user_presence pr ON pr.user_id = a.id
  LEFT JOIN public.admin_user_assessments r ON r.user_id = a.id
  LEFT JOIN LATERAL (
    SELECT count(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS consultations_24h,
           count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS consultations_30d,
           count(*) AS consultations_total,
           count(*) FILTER (WHERE status = 'completed' AND completed_at >= now() - interval '30 days') AS completed_30d,
           round(avg(score) FILTER (WHERE status = 'completed' AND completed_at >= now() - interval '30 days'), 1) AS average_score_30d
    FROM public.consultations WHERE user_id = a.id
  ) c ON true
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY pr.last_seen_at DESC NULLS LAST, a.display_name;
$$;

REVOKE ALL ON FUNCTION public.admin_activity_users(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activity_users(text) TO authenticated;
