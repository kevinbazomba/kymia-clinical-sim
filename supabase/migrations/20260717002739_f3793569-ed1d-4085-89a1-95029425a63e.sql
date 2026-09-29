
-- 1) profiles: restrict SELECT to authenticated only
DROP POLICY IF EXISTS "profiles readable by all" ON public.profiles;
CREATE POLICY "profiles readable by authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 2) community_likes: owner-only + admin
DROP POLICY IF EXISTS "likes select" ON public.community_likes;
CREATE POLICY "likes select own or admin"
  ON public.community_likes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3) jury_participants: owner-only + admin
DROP POLICY IF EXISTS "participants readable" ON public.jury_participants;
CREATE POLICY "participants select own or admin"
  ON public.jury_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4) jury_submissions: owner-only + admin
DROP POLICY IF EXISTS "submissions readable by all authed" ON public.jury_submissions;
CREATE POLICY "submissions select own or admin"
  ON public.jury_submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5) Lock down SECURITY DEFINER function EXECUTE from PUBLIC/anon.
-- Triggers use table-owner privileges regardless of EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_on_confirm() FROM PUBLIC, anon, authenticated;

-- Helpers callable from authenticated RPCs / policies
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_subscription_active(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.community_feed(text, text, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_feed(text, text, integer, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.community_user_badges(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_user_badges(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_platform_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer) TO authenticated;

-- Leaderboard is now called from an authenticated server function
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2() TO authenticated;
