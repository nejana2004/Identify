-- Quick fix for missing columns in existing tables
-- Run this in your Supabase SQL editor

-- Add missing columns to boards table
ALTER TABLE public.boards 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- Add missing columns to users table  
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pin_count INTEGER DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS board_count INTEGER DEFAULT 0;

-- Create boards table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pins table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(board_id, profile_id)
);

-- Enable RLS on new tables
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for boards
DROP POLICY IF EXISTS "Users can manage their own boards" ON public.boards;
CREATE POLICY "Users can manage their own boards" ON public.boards
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view public boards" ON public.boards;
CREATE POLICY "Everyone can view public boards" ON public.boards
  FOR SELECT USING (is_public = true);

-- Create RLS policies for pins
DROP POLICY IF EXISTS "Users can manage pins in their boards" ON public.pins;
CREATE POLICY "Users can manage pins in their boards" ON public.pins
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.boards WHERE id = board_id
    )
  );

DROP POLICY IF EXISTS "Everyone can view pins in public boards" ON public.pins;
CREATE POLICY "Everyone can view pins in public boards" ON public.pins
  FOR SELECT USING (
    (SELECT is_public FROM public.boards WHERE id = board_id) = true
  );

-- Verify the fix
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('boards', 'pins', 'users')
AND column_name IN ('is_public', 'view_count', 'pin_count', 'board_count')
ORDER BY table_name, column_name;
