
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_hidden boolean NOT NULL DEFAULT false,
  reshare_of uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts select" ON public.community_posts FOR SELECT TO authenticated
USING (is_hidden = false OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "posts insert own" ON public.community_posts FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "posts update own or admin" ON public.community_posts FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "posts delete own or admin" ON public.community_posts FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tg_community_posts_updated BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX idx_community_posts_created ON public.community_posts(created_at DESC);
CREATE INDEX idx_community_posts_user ON public.community_posts(user_id);

CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments select" ON public.community_comments FOR SELECT TO authenticated
USING (is_hidden = false OR user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "comments insert own" ON public.community_comments FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments update own or admin" ON public.community_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "comments delete own or admin" ON public.community_comments FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_community_comments_post ON public.community_comments(post_id);

CREATE TABLE public.community_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_likes TO authenticated;
GRANT ALL ON public.community_likes TO service_role;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes select" ON public.community_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "likes insert own" ON public.community_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "likes delete own" ON public.community_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.community_saves (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_saves TO authenticated;
GRANT ALL ON public.community_saves TO service_role;
ALTER TABLE public.community_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saves select own" ON public.community_saves FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "saves insert own" ON public.community_saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "saves delete own" ON public.community_saves FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.admin_list_users(text, integer);
CREATE FUNCTION public.admin_list_users(_search text DEFAULT NULL::text, _limit integer DEFAULT 100)
 RETURNS TABLE(id uuid, email text, display_name text, level text, country text, whatsapp text, profession text, kymia_gold_count integer, total_score integer, consultations_count integer, free_trial_used integer, is_suspended boolean, created_at timestamptz, last_sign_in_at timestamptz, sub_status text, sub_plan text, sub_expires_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT u.id, u.email::text, p.display_name, p.level, p.country,
         p.whatsapp, p.profession, COALESCE(p.kymia_gold_count, 0),
         p.total_score, p.consultations_count,
         COALESCE(p.free_trial_used, 0),
         COALESCE(p.is_suspended, false),
         p.created_at, u.last_sign_in_at,
         s.status, s.plan, s.expires_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT status, plan, expires_at FROM public.subscriptions
    WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
  ) s ON TRUE
  WHERE public.has_role(auth.uid(), 'admin')
    AND (_search IS NULL OR _search = ''
         OR u.email ILIKE '%' || _search || '%'
         OR p.display_name ILIKE '%' || _search || '%')
  ORDER BY u.created_at DESC
  LIMIT COALESCE(_limit, 100);
$function$;

CREATE OR REPLACE FUNCTION public.community_feed(
  _sort text DEFAULT 'recent',
  _search text DEFAULT NULL,
  _limit int DEFAULT 50,
  _only_saved boolean DEFAULT false
)
RETURNS TABLE(
  id uuid, user_id uuid, content text, is_hidden boolean,
  reshare_of uuid, created_at timestamptz,
  author_name text, author_country text,
  likes_count int, comments_count int, reshares_count int,
  liked_by_me boolean, saved_by_me boolean,
  reshare_author_name text, reshare_content text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH filtered AS (
    SELECT p.*
    FROM public.community_posts p
    WHERE (p.is_hidden = false OR p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
      AND (_search IS NULL OR _search = '' OR p.content ILIKE '%'||_search||'%')
      AND (_only_saved = false OR EXISTS (
        SELECT 1 FROM public.community_saves s WHERE s.post_id = p.id AND s.user_id = auth.uid()
      ))
  ), agg AS (
    SELECT f.id,
      (SELECT count(*)::int FROM public.community_likes l WHERE l.post_id = f.id) AS likes_count,
      (SELECT count(*)::int FROM public.community_comments c WHERE c.post_id = f.id AND c.is_hidden = false) AS comments_count,
      (SELECT count(*)::int FROM public.community_posts r WHERE r.reshare_of = f.id AND r.is_hidden = false) AS reshares_count
    FROM filtered f
  )
  SELECT f.id, f.user_id, f.content, f.is_hidden, f.reshare_of, f.created_at,
    pr.display_name, pr.country,
    a.likes_count, a.comments_count, a.reshares_count,
    EXISTS(SELECT 1 FROM public.community_likes l WHERE l.post_id = f.id AND l.user_id = auth.uid()),
    EXISTS(SELECT 1 FROM public.community_saves s WHERE s.post_id = f.id AND s.user_id = auth.uid()),
    rpr.display_name, rp.content
  FROM filtered f
  JOIN agg a ON a.id = f.id
  LEFT JOIN public.profiles pr ON pr.id = f.user_id
  LEFT JOIN public.community_posts rp ON rp.id = f.reshare_of
  LEFT JOIN public.profiles rpr ON rpr.id = rp.user_id
  ORDER BY
    CASE WHEN _sort = 'popular' THEN a.likes_count ELSE 0 END DESC,
    CASE WHEN _sort = 'commented' THEN a.comments_count ELSE 0 END DESC,
    f.created_at DESC
  LIMIT COALESCE(_limit, 50);
$$;

CREATE OR REPLACE FUNCTION public.community_user_badges(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH totals AS (
    SELECT
      (SELECT count(*) FROM public.community_posts WHERE user_id = _user_id AND is_hidden = false) AS posts,
      (SELECT count(*) FROM public.community_comments WHERE user_id = _user_id AND is_hidden = false) AS comments,
      (SELECT COALESCE(SUM(a),0) FROM (
         SELECT (SELECT count(*) FROM public.community_likes l WHERE l.post_id = p.id) AS a
         FROM public.community_posts p WHERE p.user_id = _user_id AND p.is_hidden = false
       ) x) AS total_likes,
      (SELECT max(a) FROM (
         SELECT (SELECT count(*) FROM public.community_likes l WHERE l.post_id = p.id) AS a
         FROM public.community_posts p WHERE p.user_id = _user_id AND p.is_hidden = false
       ) x) AS max_likes
  )
  SELECT jsonb_build_object(
    'top_contributor', (SELECT posts >= 10 FROM totals),
    'popular_post',    (SELECT COALESCE(max_likes,0) >= 10 FROM totals),
    'mentor',          (SELECT comments >= 20 FROM totals),
    'posts',           (SELECT posts FROM totals),
    'comments',        (SELECT comments FROM totals),
    'total_likes',     (SELECT COALESCE(total_likes,0) FROM totals),
    'max_likes',       (SELECT COALESCE(max_likes,0) FROM totals)
  );
$$;
