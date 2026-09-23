-- Subscription periods are managed exclusively through the RPCs below.  This keeps
-- the subscription seen by the member, the access gate and the administration in sync.
CREATE TABLE IF NOT EXISTS public.subscription_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  administrator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('assigned', 'extended', 'bulk_extended')),
  days_added integer NOT NULL CHECK (days_added > 0),
  previous_expires_at timestamptz,
  new_expires_at timestamptz NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_change_history_user_created_idx
  ON public.subscription_change_history (user_id, created_at DESC);

ALTER TABLE public.subscription_change_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read subscription history" ON public.subscription_change_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.subscription_change_history FROM anon, authenticated;
GRANT SELECT ON TABLE public.subscription_change_history TO authenticated;
GRANT ALL ON TABLE public.subscription_change_history TO service_role;

CREATE OR REPLACE FUNCTION public.admin_assign_subscription(
  _user_id uuid,
  _plan text,
  _status text,
  _duration_days integer,
  _comment text DEFAULT NULL
)
RETURNS TABLE (starts_at timestamptz, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_now timestamptz := now();
  v_base timestamptz;
  v_start timestamptz;
  v_expiry timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _duration_days IS NULL OR _duration_days < 1 OR _duration_days > 3650 THEN
    RAISE EXCEPTION 'invalid duration';
  END IF;
  IF _status NOT IN ('active', 'free', 'suspended', 'expired') THEN RAISE EXCEPTION 'invalid status'; END IF;

  SELECT * INTO v_sub FROM public.subscriptions
    WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  v_base := CASE WHEN v_sub.expires_at > v_now THEN v_sub.expires_at ELSE v_now END;
  v_start := CASE WHEN v_sub.id IS NOT NULL AND v_sub.expires_at > v_now THEN v_sub.starts_at ELSE v_now END;
  v_expiry := v_base + make_interval(days => _duration_days);

  IF v_sub.id IS NULL THEN
    INSERT INTO public.subscriptions (user_id, plan, status, starts_at, expires_at, notes)
      VALUES (_user_id, _plan, _status, v_start, v_expiry, _comment);
  ELSE
    UPDATE public.subscriptions SET plan = _plan, status = _status, starts_at = v_start,
      expires_at = v_expiry, notes = _comment WHERE id = v_sub.id;
  END IF;

  INSERT INTO public.subscription_change_history
    (user_id, administrator_id, action, days_added, previous_expires_at, new_expires_at, comment)
    VALUES (_user_id, auth.uid(), 'assigned', _duration_days, v_sub.expires_at, v_expiry, _comment);
  RETURN QUERY SELECT v_start, v_expiry;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extend_subscriptions(
  _user_ids uuid[],
  _days integer,
  _comment text DEFAULT NULL,
  _bulk boolean DEFAULT false
)
RETURNS TABLE (user_id uuid, previous_expires_at timestamptz, new_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_sub public.subscriptions%ROWTYPE;
  v_now timestamptz := now();
  v_base timestamptz;
  v_expiry timestamptz;
  v_start timestamptz;
  v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _days IS NULL OR _days < 1 OR _days > 3650 THEN RAISE EXCEPTION 'invalid duration'; END IF;
  FOREACH v_user_id IN ARRAY _user_ids LOOP
    SELECT * INTO v_sub FROM public.subscriptions WHERE subscriptions.user_id = v_user_id
      ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    v_base := CASE WHEN v_sub.expires_at > v_now THEN v_sub.expires_at ELSE v_now END;
    v_start := CASE WHEN v_sub.id IS NOT NULL AND v_sub.expires_at > v_now THEN v_sub.starts_at ELSE v_now END;
    v_expiry := v_base + make_interval(days => _days);
    -- An expired subscription is reactivated; an active free grant remains free.
    v_status := CASE WHEN v_sub.status = 'free' THEN 'free' WHEN v_sub.status = 'suspended' THEN 'suspended' ELSE 'active' END;
    IF v_sub.id IS NULL THEN
      INSERT INTO public.subscriptions (user_id, plan, status, starts_at, expires_at, notes)
        VALUES (v_user_id, 'standard', 'active', v_start, v_expiry, _comment);
    ELSE
      UPDATE public.subscriptions SET status = v_status, starts_at = v_start, expires_at = v_expiry,
        notes = COALESCE(_comment, notes) WHERE id = v_sub.id;
    END IF;
    INSERT INTO public.subscription_change_history
      (user_id, administrator_id, action, days_added, previous_expires_at, new_expires_at, comment)
      VALUES (v_user_id, auth.uid(), CASE WHEN _bulk THEN 'bulk_extended' ELSE 'extended' END,
        _days, v_sub.expires_at, v_expiry, _comment);
    user_id := v_user_id; previous_expires_at := v_sub.expires_at; new_expires_at := v_expiry;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_subscription_history(_user_id uuid DEFAULT NULL, _limit integer DEFAULT 100)
RETURNS TABLE (id uuid, user_id uuid, administrator_id uuid, action text, days_added integer,
  previous_expires_at timestamptz, new_expires_at timestamptz, comment text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT h.id, h.user_id, h.administrator_id, h.action, h.days_added, h.previous_expires_at,
    h.new_expires_at, h.comment, h.created_at
  FROM public.subscription_change_history h
  WHERE public.has_role(auth.uid(), 'admin') AND (_user_id IS NULL OR h.user_id = _user_id)
  ORDER BY h.created_at DESC LIMIT LEAST(COALESCE(_limit, 100), 500)
$$;

REVOKE ALL ON FUNCTION public.admin_assign_subscription(uuid, text, text, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_extend_subscriptions(uuid[], integer, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_subscription_history(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_subscription(uuid, text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_extend_subscriptions(uuid[], integer, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_subscription_history(uuid, integer) TO authenticated;
