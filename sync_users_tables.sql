-- Fix user synchronization between auth.users and public.users
-- Run this in Supabase SQL editor

-- First, let's see what we have in both tables
SELECT 
  'auth.users count' as table_info,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'public.users count' as table_info,
  COUNT(*) as count
FROM users;

-- Find auth.users that don't have corresponding public.users entries
SELECT 
  'Missing in public.users' as issue,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id
WHERE pu.id IS NULL
LIMIT 10;

-- Create missing public.users entries for auth.users
-- Note: This assumes you have the necessary columns in your users table
INSERT INTO users (id, username, name, email, created_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as name,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the sync worked
SELECT 
  'After sync - auth.users count' as table_info,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'After sync - public.users count' as table_info,
  COUNT(*) as count
FROM users
UNION ALL
SELECT 
  'Missing after sync' as table_info,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id
WHERE pu.id IS NULL;
