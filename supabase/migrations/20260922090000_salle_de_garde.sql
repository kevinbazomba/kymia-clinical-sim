-- Salle de garde: a separate community domain. Jury data and its historical
-- tables remain untouched so existing competition history is preserved.
CREATE TABLE public.guard_specialties (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Stethoscope',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.guard_specialties (id, name, description, icon, sort_order) VALUES
  ('medecine_interne', 'Médecine interne', 'Questions, cas cliniques et débats scientifiques autour de la médecine interne.', 'HeartPulse', 1),
  ('chirurgie', 'Chirurgie', 'Situations chirurgicales, urgences et discussions opératoires.', 'Scissors', 2),
  ('pediatrie', 'Pédiatrie', 'Discussions cliniques dédiées à la santé de l''enfant.', 'Baby', 3),
  ('gynecologie', 'Gynécologie-Obstétrique', 'Santé reproductive, grossesse et urgences obstétricales.', 'HeartPulse', 4),
  ('psychiatrie', 'Psychiatrie', 'Sémiologie, entretiens et prises en charge en santé mentale.', 'Brain', 5),
  ('urgences', 'Médecine d''urgence', 'Décisions rapides, détresses vitales et gestes d''urgence.', 'Siren', 6)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.guard_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id text NOT NULL REFERENCES public.guard_specialties(id),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 180),
  content text NOT NULL CHECK (char_length(content) BETWEEN 10 AND 10000),
  type text NOT NULL CHECK (type IN ('question', 'case', 'discussion', 'debate', 'revision')),
  views_count integer NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.guard_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES public.guard_discussions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_reply_id uuid REFERENCES public.guard_replies(id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 2 AND 8000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.guard_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discussion_id uuid REFERENCES public.guard_discussions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.guard_replies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('useful', 'relevant', 'interesting')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((discussion_id IS NOT NULL)::integer + (reply_id IS NOT NULL)::integer = 1)
);

CREATE UNIQUE INDEX guard_reactions_discussion_unique ON public.guard_reactions(user_id, discussion_id, type) WHERE discussion_id IS NOT NULL;
CREATE UNIQUE INDEX guard_reactions_reply_unique ON public.guard_reactions(user_id, reply_id, type) WHERE reply_id IS NOT NULL;

CREATE TABLE public.guard_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discussion_id uuid REFERENCES public.guard_discussions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.guard_replies(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('dangerous_information', 'inappropriate', 'misinformation', 'harassment', 'spam', 'other')),
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((discussion_id IS NOT NULL)::integer + (reply_id IS NOT NULL)::integer = 1)
);

CREATE TABLE public.guard_followers (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discussion_id uuid NOT NULL REFERENCES public.guard_discussions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, discussion_id)
);

CREATE TABLE public.guard_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discussion_id uuid REFERENCES public.guard_discussions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES public.guard_replies(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guard_discussions_specialty_created_idx ON public.guard_discussions(specialty_id, created_at DESC) WHERE NOT is_hidden;
CREATE INDEX guard_replies_discussion_created_idx ON public.guard_replies(discussion_id, created_at) WHERE NOT is_hidden;
CREATE INDEX guard_notifications_user_created_idx ON public.guard_notifications(user_id, created_at DESC);

CREATE TRIGGER trg_guard_discussions_updated BEFORE UPDATE ON public.guard_discussions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_guard_replies_updated BEFORE UPDATE ON public.guard_replies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

GRANT SELECT ON public.guard_specialties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guard_discussions, public.guard_replies, public.guard_reactions, public.guard_reports, public.guard_followers, public.guard_notifications TO authenticated;
GRANT ALL ON public.guard_specialties, public.guard_discussions, public.guard_replies, public.guard_reactions, public.guard_reports, public.guard_followers, public.guard_notifications TO service_role;

ALTER TABLE public.guard_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guard specialties readable" ON public.guard_specialties FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard discussions readable" ON public.guard_discussions FOR SELECT TO authenticated USING (NOT is_hidden OR author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard discussions create own" ON public.guard_discussions FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "guard discussions update own or admin" ON public.guard_discussions FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard discussions delete own or admin" ON public.guard_discussions FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard replies readable" ON public.guard_replies FOR SELECT TO authenticated USING (NOT is_hidden OR author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard replies create own" ON public.guard_replies FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "guard replies update own or admin" ON public.guard_replies FOR UPDATE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard replies delete own or admin" ON public.guard_replies FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard reactions readable" ON public.guard_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "guard reactions own" ON public.guard_reactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "guard reports create own" ON public.guard_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "guard reports admin read" ON public.guard_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard reports admin update" ON public.guard_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "guard followers own" ON public.guard_followers FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "guard notifications own" ON public.guard_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "guard notifications own update" ON public.guard_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
