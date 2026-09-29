-- Subscriptions table for admin-managed subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'active', -- active | suspended | expired
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_user_id_idx ON public.subscriptions(user_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users read only their own subscription; admins read all
CREATE POLICY "users read own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Admin helper: list users with profile + subscription + email (SECURITY DEFINER to read auth.users)
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL, _limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  level text,
  country text,
  total_score int,
  consultations_count int,
  created_at timestamptz,
  sub_status text,
  sub_plan text,
  sub_expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email::text,
    p.display_name,
    p.level,
    p.country,
    p.total_score,
    p.consultations_count,
    p.created_at,
    s.status,
    s.plan,
    s.expires_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT status, plan, expires_at
    FROM public.subscriptions
    WHERE user_id = u.id
    ORDER BY created_at DESC LIMIT 1
  ) s ON TRUE
  WHERE public.has_role(auth.uid(), 'admin')
    AND (_search IS NULL OR _search = ''
         OR u.email ILIKE '%' || _search || '%'
         OR p.display_name ILIKE '%' || _search || '%')
  ORDER BY u.created_at DESC
  LIMIT COALESCE(_limit, 100);
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, int) TO authenticated;

-- Admin stats
CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'active_subs', (SELECT count(*) FROM public.subscriptions WHERE status = 'active' AND (expires_at IS NULL OR expires_at > now())),
    'expired_subs', (SELECT count(*) FROM public.subscriptions WHERE status = 'expired' OR (expires_at IS NOT NULL AND expires_at <= now())),
    'suspended_subs', (SELECT count(*) FROM public.subscriptions WHERE status = 'suspended'),
    'total_consultations', (SELECT count(*) FROM public.consultations),
    'completed_consultations', (SELECT count(*) FROM public.consultations WHERE status = 'completed'),
    'by_specialty', (SELECT jsonb_object_agg(specialty, cnt) FROM (SELECT specialty, count(*) cnt FROM public.consultations GROUP BY specialty) t),
    'top_users', (SELECT jsonb_agg(row_to_json(x)) FROM (
        SELECT p.id, p.display_name, p.total_score, p.consultations_count
        FROM public.profiles p
        WHERE p.consultations_count > 0
        ORDER BY p.consultations_count DESC LIMIT 10
      ) x)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.admin_platform_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;