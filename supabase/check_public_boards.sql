-- Check how many public boards exist
SELECT 
  id, 
  title, 
  is_public, 
  user_id,
  created_at
FROM boards 
ORDER BY created_at DESC;

-- Count public vs private
SELECT 
  is_public,
  COUNT(*) as count
FROM boards
GROUP BY is_public;
