-- Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- First, ensure we have the correct RLS policies set up
-- This policy allows users to select only their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view own data'
  ) THEN
    CREATE POLICY "Users can view own data" ON "public"."users"
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- This policy allows users to update only their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update own data'
  ) THEN
    CREATE POLICY "Users can update own data" ON "public"."users"
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- This policy allows authenticated users to insert their own data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can insert own data'
  ) THEN
    CREATE POLICY "Users can insert own data" ON "public"."users"
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Create a secure RPC function that can bypass RLS to create/update user profiles
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_name TEXT,
  user_username TEXT
) RETURNS BOOLEAN
SECURITY DEFINER -- This makes the function run with the privileges of the creator
SET search_path = public
AS $$
BEGIN
  -- Check if the user exists
  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    -- Update existing user
    UPDATE public.users
    SET 
      name = user_name,
      username = user_username,
      updated_at = now()
    WHERE id = user_id;
  ELSE
    -- Insert new user
    INSERT INTO public.users (id, name, username, created_at, updated_at)
    VALUES (user_id, user_name, user_username, now(), now());
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Create the profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    name TEXT,
    bio TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Set up RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON "public"."profiles"
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- Allow users to update their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON "public"."profiles"
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Allow users to insert their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON "public"."profiles"
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Create a function to handle profile operations that bypasses RLS
CREATE OR REPLACE FUNCTION create_user_profile_complete(
  user_id UUID,
  user_name TEXT,
  user_username TEXT,
  user_bio TEXT DEFAULT NULL,
  user_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the profile exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    -- Update existing profile
    UPDATE public.profiles
    SET 
      name = user_name,
      username = user_username,
      bio = COALESCE(user_bio, bio),
      metadata = COALESCE(user_metadata, metadata),
      updated_at = now()
    WHERE id = user_id;
  ELSE
    -- Insert new profile
    INSERT INTO public.profiles (id, name, username, bio, metadata, created_at, updated_at)
    VALUES (user_id, user_name, user_username, user_bio, user_metadata, now(), now());
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
