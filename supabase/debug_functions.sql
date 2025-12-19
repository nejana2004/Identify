-- Additional functions for debugging

-- Function specifically for the debug page
CREATE OR REPLACE FUNCTION manual_insert_user(
  user_id UUID,
  user_name TEXT,
  user_username TEXT
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert directly with no RLS checks
  INSERT INTO public.users (id, name, username, created_at, updated_at)
  VALUES (user_id, user_name, user_username, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET name = user_name, username = user_username, updated_at = now();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
