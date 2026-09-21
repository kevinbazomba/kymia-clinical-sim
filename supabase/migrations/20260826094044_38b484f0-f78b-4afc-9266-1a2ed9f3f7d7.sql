ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr';
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr';
ALTER TABLE public.jury_submissions ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr';