-- Diagnostic script to check users and profile IDs
-- Run this in Supabase SQL editor

-- Check users in public.users table
SELECT 
  id,
  username,
  name,
  created_at,
  length(id::text) as id_length,
  substr(id::text, 1, 8) as id_prefix
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check auth.users table
SELECT 
  id,
  email,
  created_at,
  length(id::text) as id_length,
  substr(id::text, 1, 8) as id_prefix
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if there are any mismatched IDs
SELECT 
  'auth_only' as source,
  au.id,
  au.email
FROM auth.users au
LEFT JOIN users pu ON au.id = pu.id::uuid
WHERE pu.id IS NULL
LIMIT 5;

-- Check recent pins and their profile IDs
SELECT 
  p.id,
  p.profile_id,
  p.board_id,
  p.created_at,
  u.username,
  u.name
FROM pins p
LEFT JOIN users u ON p.profile_id = u.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Check boards
SELECT 
  id,
  title,
  user_id,
  created_at
FROM boards
ORDER BY created_at DESC
LIMIT 5;
