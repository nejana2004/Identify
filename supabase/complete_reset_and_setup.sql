-- Complete reset and setup of public.users table
-- This script will drop and recreate the users table with the correct structure

-- First, drop existing table if it exists
DROP TABLE IF EXISTS public.users CASCADE;

-- Create the users table with the correct structure
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT, -- Make email nullable
  bio TEXT,
  profile_photo TEXT,
  country TEXT,
  tags_created JSONB DEFAULT '[]'::jsonb,
  tags_liked JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  onboarded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on the table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "All users can insert" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "All users can select" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "All users can update" ON public.users
  FOR UPDATE USING (true);

-- Create better insert function that handles all fields properly
CREATE OR REPLACE FUNCTION manual_insert_user(
  user_id UUID,
  user_name TEXT,
  user_username TEXT
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert directly with no RLS checks
  INSERT INTO public.users (
    id, 
    name, 
    username, 
    email,
    bio,
    country,
    created_at, 
    updated_at
  )
  VALUES (
    user_id, 
    user_name, 
    user_username, 
    NULL, -- email is now nullable
    'Created via debug tool',
    'Unknown',
    now(), 
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = user_name, 
    username = user_username, 
    updated_at = now();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create debug insert function for troubleshooting
CREATE OR REPLACE FUNCTION direct_insert_debug(
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
  pre_exists BOOLEAN;
  post_exists BOOLEAN;
  error_occurred BOOLEAN := FALSE;
  error_message TEXT;
BEGIN
  -- Check if user exists before insert
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id) INTO pre_exists;
  
  -- Try to insert or update
  BEGIN
    INSERT INTO public.users (
      id, 
      name, 
      username, 
      email,
      bio,
      country,
      created_at, 
      updated_at
    )
    VALUES (
      user_id, 
      user_name, 
      user_username, 
      NULL, -- email is now nullable
      'Created via debug tool',
      'Unknown',
      now(), 
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      name = user_name, 
      username = user_username, 
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    error_occurred := TRUE;
    error_message := SQLERRM;
  END;
  
  -- Check if user exists after insert
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = user_id) INTO post_exists;
  
  -- Get user record if it exists
  DECLARE
    user_record JSONB := NULL;
  BEGIN
    IF post_exists THEN
      SELECT row_to_json(u)::jsonb INTO user_record
      FROM public.users u 
      WHERE id = user_id;
    END IF;
  END;
  
  -- Build detailed result
  result := jsonb_build_object(
    'success', NOT error_occurred,
    'pre_exists', pre_exists,
    'post_exists', post_exists,
    'user_id', user_id,
    'username', user_username
  );
  
  IF error_occurred THEN
    result := result || jsonb_build_object('error', error_message);
  END IF;
  
  IF user_record IS NOT NULL THEN
    result := result || jsonb_build_object('user_record', user_record);
  END IF;
  
  RETURN result;
END;
$$;

-- Create user_exists function
CREATE OR REPLACE FUNCTION user_exists(user_id UUID) 
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.users WHERE id = user_id;
  RETURN user_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Verify RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';
