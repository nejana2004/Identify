-- Schema Fix for Users Table
-- This script detects and resolves issues with the public.users table

-- Check if multiple user tables exist and describe them
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'users';

-- Show columns for public.users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Create a proper public.users table if needed
DO $$
BEGIN
  -- First check if the table exists but is missing columns
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    -- Table exists but needs updated_at column
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    RAISE NOTICE 'Added updated_at column to existing public.users table';
  
  -- If the table doesn't exist, create it properly
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    CREATE TABLE public.users (
      id UUID PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT,
      email TEXT,
      bio TEXT,
      profile_photo TEXT,
      country TEXT,
      tags_created JSONB,
      tags_liked JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      onboarded_at TIMESTAMP WITH TIME ZONE
    );
    
    -- Add RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'Created new public.users table with all required columns';
  ELSE
    RAISE NOTICE 'public.users table exists with updated_at column';
  END IF;

  -- Add DEBUG policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'All users can insert'
  ) THEN
    CREATE POLICY "All users can insert" ON public.users
      FOR INSERT WITH CHECK (true);
    RAISE NOTICE 'Added insert policy';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'All users can select'
  ) THEN
    CREATE POLICY "All users can select" ON public.users
      FOR SELECT USING (true);
    RAISE NOTICE 'Added select policy';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'All users can update'
  ) THEN
    CREATE POLICY "All users can update" ON public.users
      FOR UPDATE USING (true);
    RAISE NOTICE 'Added update policy';
  END IF;
END $$;

-- Verify the fix worked by listing columns again
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- List all policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';
