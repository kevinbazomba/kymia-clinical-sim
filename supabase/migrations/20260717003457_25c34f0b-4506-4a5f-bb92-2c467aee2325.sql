
-- Add strict rubric subscores + submission duration for tie-breaking on jury_submissions
ALTER TABLE public.jury_submissions
  ADD COLUMN IF NOT EXISTS reasoning_score integer,
  ADD COLUMN IF NOT EXISTS copy_quality_score integer,
  ADD COLUMN IF NOT EXISTS investigation_score integer,
  ADD COLUMN IF NOT EXISTS duration_sec integer;

-- History of Jury victories on the profile (list of { session_id, scheduled_at, week_label, specialty })
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS jury_wins jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Composite index to speed strict tie-break ordering per session
CREATE INDEX IF NOT EXISTS jury_submissions_session_score_tiebreak_idx
  ON public.jury_submissions (session_id, score DESC, reasoning_score DESC, copy_quality_score DESC, investigation_score DESC, duration_sec ASC);
