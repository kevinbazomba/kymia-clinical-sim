ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS cycle text NOT NULL DEFAULT 'second',
  ADD COLUMN IF NOT EXISTS subspecialty text,
  ADD COLUMN IF NOT EXISTS mentor_messages jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS consultations_cycle_idx ON public.consultations(cycle);

-- Rebuild leaderboard to only count Second cycle consultations
CREATE OR REPLACE FUNCTION public.get_leaderboard_v2()
RETURNS TABLE(id uuid, display_name text, country text, avg_score numeric, consultations_count integer, total_score integer, kymia_gold_count integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH agg AS (
    SELECT c.user_id,
           COUNT(*)::int AS n,
           COALESCE(SUM(c.score), 0)::int AS total,
           ROUND(AVG(c.score)::numeric, 1) AS avg
    FROM public.consultations c
    WHERE c.status = 'completed'
      AND c.score IS NOT NULL
      AND COALESCE(c.cycle, 'second') = 'second'
    GROUP BY c.user_id
  )
  SELECT p.id, p.display_name, p.country,
         a.avg AS avg_score,
         a.n AS consultations_count,
         a.total AS total_score,
         COALESCE(p.kymia_gold_count, 0) AS kymia_gold_count
  FROM public.profiles p
  JOIN agg a ON a.user_id = p.id
  ORDER BY a.avg DESC, a.n DESC
  LIMIT 50;
$$;