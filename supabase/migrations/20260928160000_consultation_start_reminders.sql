CREATE TABLE IF NOT EXISTS public.pedagogical_reminder_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  disabled_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedagogical_consultation_start_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  shown_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consultation_id)
);

ALTER TABLE public.pedagogical_reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedagogical_consultation_start_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pedagogical_reminder_preferences FROM anon, authenticated;
REVOKE ALL ON TABLE public.pedagogical_consultation_start_reminders FROM anon, authenticated;
GRANT ALL ON TABLE public.pedagogical_reminder_preferences TO service_role;
GRANT ALL ON TABLE public.pedagogical_consultation_start_reminders TO service_role;

CREATE OR REPLACE FUNCTION public.set_pedagogical_reminder_disabled(_disabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF _disabled THEN
    INSERT INTO public.pedagogical_reminder_preferences (user_id)
    VALUES (auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET disabled_at = now();
  ELSE
    DELETE FROM public.pedagogical_reminder_preferences WHERE user_id = auth.uid();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_pedagogical_reminder_disabled(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_pedagogical_reminder_disabled(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.should_show_consultation_start_reminder()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_last_consultation uuid;
BEGIN
  IF auth.uid() IS NULL OR EXISTS (
    SELECT 1 FROM public.pedagogical_reminder_preferences WHERE user_id = auth.uid()
  ) THEN
    RETURN false;
  END IF;

  SELECT count(*), (array_agg(id ORDER BY completed_at DESC))[1]
  INTO v_count, v_last_consultation
  FROM public.consultations
  WHERE user_id = auth.uid()
    AND status = 'completed'
    AND completed_at >= now() - interval '24 hours';

  -- Two completed consultations means the next launch is the third.
  IF v_count <> 2 OR v_last_consultation IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.pedagogical_consultation_start_reminders (user_id, consultation_id)
  VALUES (auth.uid(), v_last_consultation)
  ON CONFLICT (consultation_id) DO NOTHING;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.should_show_consultation_start_reminder() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.should_show_consultation_start_reminder() TO authenticated;
