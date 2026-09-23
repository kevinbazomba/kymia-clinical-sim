-- One record per threshold-crossing consultation prevents the coach message from
-- being redisplayed when a completed consultation is revisited or retried.
CREATE TABLE IF NOT EXISTS public.pedagogical_consultation_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  shown_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consultation_id)
);

CREATE INDEX IF NOT EXISTS pedagogical_reminders_user_shown_idx
  ON public.pedagogical_consultation_reminders (user_id, shown_at DESC);

ALTER TABLE public.pedagogical_consultation_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own pedagogical reminders" ON public.pedagogical_consultation_reminders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

REVOKE ALL ON TABLE public.pedagogical_consultation_reminders FROM anon, authenticated;
GRANT SELECT ON TABLE public.pedagogical_consultation_reminders TO authenticated;
GRANT ALL ON TABLE public.pedagogical_consultation_reminders TO service_role;

CREATE OR REPLACE FUNCTION public.should_show_pedagogical_reminder(_consultation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- The function is intentionally advisory: it never blocks a consultation.
  IF NOT EXISTS (
    SELECT 1 FROM public.consultations
    WHERE id = _consultation_id AND user_id = auth.uid() AND status = 'completed'
  ) THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_count FROM public.consultations
  WHERE user_id = auth.uid()
    AND status = 'completed'
    AND completed_at >= now() - interval '24 hours';

  IF v_count <> 5 THEN RETURN false; END IF;

  INSERT INTO public.pedagogical_consultation_reminders (user_id, consultation_id)
    VALUES (auth.uid(), _consultation_id)
    ON CONFLICT (consultation_id) DO NOTHING;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.should_show_pedagogical_reminder(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.should_show_pedagogical_reminder(uuid) TO authenticated;
