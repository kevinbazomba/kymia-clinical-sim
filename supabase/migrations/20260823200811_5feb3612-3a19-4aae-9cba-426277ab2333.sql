CREATE TABLE public.case_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES public.consultations(id) ON DELETE SET NULL,
  specialty text NOT NULL,
  subspecialty text,
  pathology_key text NOT NULL,
  pathology_label text NOT NULL,
  diagnosis text,
  chief_complaint text,
  presentation_angle text,
  age integer,
  sex text,
  difficulty text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.case_registry TO authenticated;
GRANT ALL ON public.case_registry TO service_role;

ALTER TABLE public.case_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_registry select own or admin" ON public.case_registry
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "case_registry insert own" ON public.case_registry
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_case_registry_user_created ON public.case_registry (user_id, created_at DESC);
CREATE INDEX idx_case_registry_spec_path ON public.case_registry (specialty, pathology_key);

CREATE OR REPLACE FUNCTION public.global_pathology_usage(_specialty text, _subspecialty text DEFAULT NULL)
RETURNS TABLE(pathology_key text, uses integer, last_seen timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.pathology_key, count(*)::int, max(r.created_at)
  FROM public.case_registry r
  WHERE r.specialty = _specialty
    AND (_subspecialty IS NULL OR r.subspecialty = _subspecialty)
    AND r.created_at > now() - interval '90 days'
  GROUP BY r.pathology_key;
$$;

REVOKE ALL ON FUNCTION public.global_pathology_usage(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.global_pathology_usage(text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_case_diversity(_specialty text DEFAULT NULL)
RETURNS TABLE(specialty text, subspecialty text, pathology_key text, pathology_label text, times_generated integer, last_seen timestamp with time zone, share numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT r.specialty, COALESCE(r.subspecialty, '') AS subspecialty,
           r.pathology_key, min(r.pathology_label) AS pathology_label,
           count(*)::int AS times_generated, max(r.created_at) AS last_seen
    FROM public.case_registry r
    WHERE public.has_role(auth.uid(), 'admin')
      AND (_specialty IS NULL OR _specialty = '' OR r.specialty = _specialty)
    GROUP BY r.specialty, COALESCE(r.subspecialty, ''), r.pathology_key
  )
  SELECT b.specialty, b.subspecialty, b.pathology_key, b.pathology_label,
         b.times_generated, b.last_seen,
         ROUND(100.0 * b.times_generated / NULLIF(SUM(b.times_generated) OVER (PARTITION BY b.specialty), 0), 1)
  FROM base b
  ORDER BY b.times_generated DESC, b.last_seen DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_case_diversity(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_case_diversity(text) TO authenticated, service_role;