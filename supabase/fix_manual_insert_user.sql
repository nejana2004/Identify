-- Fix for manual_insert_user function to handle updated_at correctly

CREATE OR REPLACE FUNCTION manual_insert_user(
  user_id UUID,
  user_name TEXT,
  user_username TEXT
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  has_updated_at BOOLEAN;
BEGIN
  -- Check if the public.users table has an updated_at column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
  ) INTO has_updated_at;

  -- Insert directly with no RLS checks
  IF has_updated_at THEN
    -- If updated_at exists, use it
    INSERT INTO public.users (id, name, username, created_at, updated_at)
    VALUES (user_id, user_name, user_username, now(), now())
    ON CONFLICT (id) DO UPDATE
    SET name = user_name, username = user_username, updated_at = now();
  ELSE
    -- If updated_at doesn't exist, omit it
    INSERT INTO public.users (id, name, username, created_at)
    VALUES (user_id, user_name, user_username, now())
    ON CONFLICT (id) DO UPDATE
    SET name = user_name, username = user_username;
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;
