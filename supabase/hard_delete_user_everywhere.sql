-- Hard delete a user everywhere (auth + public tables)
-- Run in Supabase SQL editor as postgres/service role.
-- Set exactly one of these values before running.

DO $$
DECLARE
  v_user_id UUID := NULL;               -- Example: '11111111-1111-1111-1111-111111111111'
  v_username TEXT := 'identify.ink';    -- Example: 'identify.ink'
  v_email TEXT := NULL;                 -- Example: 'user@example.com'
  v_target_id UUID;
BEGIN
  -- Resolve target user id from explicit id, username, or email.
  IF v_user_id IS NOT NULL THEN
    v_target_id := v_user_id;
  ELSIF v_username IS NOT NULL THEN
    SELECT id INTO v_target_id
    FROM public.users
    WHERE username = v_username
    LIMIT 1;
  ELSIF v_email IS NOT NULL THEN
    SELECT id INTO v_target_id
    FROM public.users
    WHERE email = v_email
    LIMIT 1;
  END IF;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'No matching user found in public.users';
  END IF;

  RAISE NOTICE 'Deleting user id: %', v_target_id;

  -- Delete auth row first. If your on_auth_user_deleted trigger exists,
  -- this cascades cleanup automatically by removing public.users.
  DELETE FROM auth.users WHERE id = v_target_id;

  -- Safety fallback in case trigger is missing in this environment.
  DELETE FROM public.profiles WHERE id = v_target_id;
  DELETE FROM public.users WHERE id = v_target_id;

  RAISE NOTICE 'Delete complete for user id: %', v_target_id;
END $$;

-- Verification checks (should all be zero rows for this user):
-- SELECT * FROM auth.users WHERE id = '<USER_ID>';
-- SELECT * FROM public.users WHERE id = '<USER_ID>';
-- SELECT * FROM public.profiles WHERE id = '<USER_ID>';
