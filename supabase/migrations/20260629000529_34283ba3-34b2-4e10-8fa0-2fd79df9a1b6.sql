ALTER TABLE public.consultations 
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS theme text,
  ADD COLUMN IF NOT EXISTS course text,
  ADD COLUMN IF NOT EXISTS mentor_log jsonb NOT NULL DEFAULT '[]'::jsonb;