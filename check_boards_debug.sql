-- Check boards and their accessibility
-- Run this in Supabase SQL editor

-- 1. Check all boards in the system
SELECT 
  'all_boards' as source,
  id,
  title,
  description,
  is_public,
  user_id,
  created_at
FROM boards
ORDER BY created_at DESC;

-- 2. Check board ownership and user relationships
SELECT 
  'board_with_user' as source,
  b.id as board_id,
  b.title,
  b.is_public,
  b.user_id,
  u.username as owner_username,
  u.name as owner_name
FROM boards b
LEFT JOIN users u ON b.user_id = u.id
ORDER BY b.created_at DESC;

-- 3. Check the exact board ID that's failing (replace with actual ID from URL)
-- You'll need to replace 'BOARD_ID_HERE' with the actual board ID from the URL
-- SELECT 
--   'specific_board' as source,
--   b.*,
--   u.username as owner_username
-- FROM boards b
-- LEFT JOIN users u ON b.user_id = u.id
-- WHERE b.id = 'BOARD_ID_HERE';

-- 4. Check pins for any board
SELECT 
  'pins_summary' as source,
  p.board_id,
  b.title as board_title,
  COUNT(p.id) as pin_count
FROM pins p
LEFT JOIN boards b ON p.board_id = b.id
GROUP BY p.board_id, b.title
ORDER BY pin_count DESC;

-- 5. Check if there are any RLS policies affecting board access
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'boards';
