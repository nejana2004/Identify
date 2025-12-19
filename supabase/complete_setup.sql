-- COMPLETE SETUP SCRIPT FOR IDENTIFY APP
-- Run this entire script in the Supabase SQL Editor

-- 1. Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create the profiles table if it doesn't exist (for compatibility)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    name TEXT,
    bio TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Set up RLS policies (with safe creation that won't error if they exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view own data'
  ) THEN
    CREATE POLICY "Users can view own data" ON "public"."users"
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own data'
  ) THEN
    CREATE POLICY "Users can update own data" ON "public"."users"
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own data'
  ) THEN
    CREATE POLICY "Users can insert own data" ON "public"."users"
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 5. Create function to create user bypassing RLS
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_name TEXT,
  user_username TEXT
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the user record
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

-- 6. Create a manual insert function for debugging
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

-- 7. Create function to check if a user exists
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

-- 8. Create function to get user if exists
CREATE OR REPLACE FUNCTION get_user_if_exists(user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_record JSONB;
  exists_bool BOOLEAN;
BEGIN
  -- Check if the user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = user_id) INTO exists_bool;
  
  -- If user exists, try to get the record
  IF exists_bool THEN
    SELECT row_to_json(u)::jsonb INTO user_record
    FROM users u 
    WHERE id = user_id;
    
    RETURN jsonb_build_object(
      'exists', true,
      'user', user_record
    );
  ELSE
    RETURN jsonb_build_object(
      'exists', false
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'exists', null,
    'error', SQLERRM
  );
END;
$$;

-- 9. Create admin function that does everything in one go
CREATE OR REPLACE FUNCTION admin_create_user_complete(
  user_id UUID,
  user_name TEXT,
  user_username TEXT
) RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  created_user JSONB;
BEGIN
  -- Insert or update the user record
  INSERT INTO public.users (
    id, 
    name, 
    username, 
    created_at, 
    updated_at
  )
  VALUES (
    user_id, 
    user_name, 
    user_username, 
    now(), 
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = user_name,
    username = user_username,
    updated_at = now();

  -- Immediately retrieve the inserted record to confirm it worked
  SELECT row_to_json(u)::jsonb INTO created_user
  FROM public.users u
  WHERE u.id = user_id;

  -- Build the return object
  result := jsonb_build_object(
    'success', true,
    'user', created_user,
    'message', 'User created with admin privileges'
  );

  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- Return detailed error information
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- 10. Add permissive RLS policy to allow users to see their own records
DROP POLICY IF EXISTS "Users can see their own record" ON public.users;
CREATE POLICY "Users can see their own record" ON public.users
  FOR SELECT
  USING (auth.uid() = id);
