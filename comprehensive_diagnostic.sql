-- Comprehensive diagnostic to understand the pin constraint issue
-- Run this in Supabase SQL editor

-- 1. Show what's in the public.users table
SELECT 
  'public.users' as source,
  id,
  username,
  name,
  email,
  created_at
FROM users
ORDER BY created_at DESC;

-- 2. Show what would be returned by the explore page query
SELECT 
  'explore_query' as source,
  id,
  username,
  name,
  bio,
  profile_photo,
  country,
  tags_created,
  pin_count,
  view_count
FROM users
ORDER BY pin_count DESC
LIMIT 10;

-- 3. Check if there are any duplicate or invalid IDs
SELECT 
  id,
  COUNT(*) as count
FROM users
GROUP BY id
HAVING COUNT(*) > 1;

-- 4. Check the exact data types
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
AND column_name = 'id';

-- 5. Check pins table for any existing data
SELECT 
  'existing_pins' as source,
  p.id,
  p.profile_id,
  p.board_id,
  u.username
FROM pins p
LEFT JOIN users u ON p.profile_id = u.id
ORDER BY p.created_at DESC
LIMIT 5;
