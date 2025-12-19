-- Targeted diagnostic for the specific UUID: 8963cb19-746a-46a0-b19c-3152357de2fd
-- Run this in Supabase SQL editor

-- Check if this ID exists in public.users
SELECT 
  'public.users' as table_name,
  id,
  username,
  name,
  created_at
FROM users 
WHERE id = '8963cb19-746a-46a0-b19c-3152357de2fd';

-- Check if this ID exists in auth.users
SELECT 
  'auth.users' as table_name,
  id,
  email,
  created_at
FROM auth.users 
WHERE id = '8963cb19-746a-46a0-b19c-3152357de2fd';

-- Check if this ID has any pins
SELECT 
  'pins' as table_name,
  id,
  profile_id,
  board_id,
  created_at
FROM pins 
WHERE profile_id = '8963cb19-746a-46a0-b19c-3152357de2fd';

-- Check if this ID owns any boards
SELECT 
  'boards' as table_name,
  id,
  title,
  user_id,
  created_at
FROM boards 
WHERE user_id = '8963cb19-746a-46a0-b19c-3152357de2fd';
