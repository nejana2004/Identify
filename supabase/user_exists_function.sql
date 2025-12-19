-- Additional helper function to check if a user exists
-- This bypasses RLS to simply check if a user record exists
CREATE OR REPLACE FUNCTION user_exists(user_id UUID) 
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users WHERE id = user_id;
  RETURN user_count > 0;
END;
$$ LANGUAGE plpgsql;
