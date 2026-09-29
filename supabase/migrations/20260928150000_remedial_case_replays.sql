-- Link one remedial replay to each source consultation.
ALTER TABLE public.case_registry
  ADD COLUMN IF NOT EXISTS replay_of uuid
  REFERENCES public.consultations(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS case_registry_replay_of_unique
  ON public.case_registry(replay_of)
  WHERE replay_of IS NOT NULL;
