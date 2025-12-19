-- Check for existing pins and potential conflicts
-- Run this in Supabase SQL editor

-- Check all existing pins
SELECT 
  'existing_pins' as source,
  p.id,
  p.profile_id,
  p.board_id,
  p.created_at,
  u.username as profile_username,
  b.title as board_title
FROM pins p
LEFT JOIN users u ON p.profile_id = u.id
LEFT JOIN boards b ON p.board_id = b.id
ORDER BY p.created_at DESC;

-- Check for any orphaned pins (pins with invalid profile_id)
SELECT 
  'orphaned_pins' as source,
  p.id,
  p.profile_id,
  p.board_id,
  'Profile not found' as issue
FROM pins p
LEFT JOIN users u ON p.profile_id = u.id
WHERE u.id IS NULL;

-- Check unique constraints on pins table
SELECT 
  constraint_name,
  column_name
FROM information_schema.key_column_usage 
WHERE table_name = 'pins' 
AND table_schema = 'public';

-- Show the exact table structure for pins
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pins' 
AND table_schema = 'public'
ORDER BY ordinal_position;
