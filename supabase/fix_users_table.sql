-- Script to fix users table structure
-- This script will add any missing columns required for the application

-- Check if users table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE TABLE public.users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Add RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'Created users table from scratch';
  ELSE
    RAISE NOTICE 'Users table already exists';
  END IF;
END $$;

-- Add missing columns if needed
DO $$
BEGIN
  -- Check and add updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    RAISE NOTICE 'Added missing updated_at column';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
  
  -- Check and add created_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;
    RAISE NOTICE 'Added missing created_at column';
  ELSE
    RAISE NOTICE 'created_at column already exists';
  END IF;
  
  -- Check and add name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
    ALTER TABLE public.users ADD COLUMN name TEXT;
    RAISE NOTICE 'Added missing name column';
  ELSE
    RAISE NOTICE 'name column already exists';
  END IF;
  
  -- Check and add username column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE public.users ADD COLUMN username TEXT;
    RAISE NOTICE 'Added missing username column';
  ELSE
    RAISE NOTICE 'username column already exists';
  END IF;
END $$;

-- Add DEBUG policies for development
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'DEBUG - Allow all select'
  ) THEN
    CREATE POLICY "DEBUG - Allow all select" ON public.users
      FOR SELECT USING (true);
    RAISE NOTICE 'Added DEBUG select policy';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'DEBUG - Allow all insert'
  ) THEN
    CREATE POLICY "DEBUG - Allow all insert" ON public.users
      FOR INSERT WITH CHECK (true);
    RAISE NOTICE 'Added DEBUG insert policy';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'DEBUG - Allow all update'
  ) THEN
    CREATE POLICY "DEBUG - Allow all update" ON public.users
      FOR UPDATE USING (true);
    RAISE NOTICE 'Added DEBUG update policy';
  END IF;
END $$;

-- List all columns for verification
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- List all policies for verification
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
WHERE tablename = 'users';
