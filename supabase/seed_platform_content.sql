-- Sync real Supabase auth users into the public user/profile tables.
-- This script preserves any existing boards, pins, threads, and cards in the
-- public schema and only backfills missing user/profile data or lightweight
-- starter content when the relevant tables are empty.

BEGIN;

INSERT INTO public.users (
  id,
  username,
  name,
  email,
  bio,
  country,
  profile_photo,
  tags_created,
  onboarded_at,
  pin_count,
  view_count,
  board_count,
  created_at,
  updated_at
)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', lower(split_part(au.email, '@', 1))),
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  NULL,
  NULL,
  NULL,
  '[]'::jsonb,
  au.created_at,
  0,
  0,
  0,
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (
  id,
  username,
  name,
  bio,
  avatar_url,
  country,
  metadata,
  created_at,
  updated_at
)
SELECT
  pu.id,
  pu.username,
  pu.name,
  NULL,
  pu.profile_photo,
  pu.country,
  '{}'::jsonb,
  pu.created_at,
  pu.updated_at
FROM public.users pu
LEFT JOIN public.profiles pr ON pr.id = pu.id
WHERE pr.id IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.boards (
  title,
  slug,
  description,
  user_id,
  is_public,
  cover_image,
  board_type,
  topic_tags,
  created_at,
  updated_at
)
SELECT
  format('%s''s starter board', COALESCE(pu.name, pu.username)),
  lower(regexp_replace(COALESCE(pu.username, split_part(pu.email, '@', 1)), '[^a-z0-9]+', '-', 'g')) || '-starter-board',
  'Starter board created from the existing user record.',
  pu.id,
  TRUE,
  NULL,
  'open',
  ARRAY['starter', 'community']::TEXT[],
  NOW(),
  NOW()
FROM public.users pu
WHERE NOT EXISTS (
  SELECT 1 FROM public.boards b WHERE b.user_id = pu.id
)
ORDER BY pu.created_at
LIMIT 3;

INSERT INTO public.board_members (board_id, user_id, role, joined_at)
SELECT
  b.id,
  b.user_id,
  'owner',
  NOW()
FROM public.boards b
LEFT JOIN public.board_members bm ON bm.board_id = b.id AND bm.user_id = b.user_id
WHERE bm.id IS NULL;

INSERT INTO public.board_followers (board_id, user_id, created_at)
SELECT
  b.id,
  b.user_id,
  NOW()
FROM public.boards b
LEFT JOIN public.board_followers bf ON bf.board_id = b.id AND bf.user_id = b.user_id
WHERE bf.id IS NULL;

INSERT INTO public.threads (
  board_id,
  author_id,
  title,
  body,
  thread_type,
  is_pinned,
  is_solved,
  is_indexed,
  save_count,
  click_count,
  view_count,
  created_at,
  updated_at
)
SELECT
  b.id,
  b.user_id,
  'What is the next step for this board?',
  'This thread was created from the real user account associated with the board.',
  'question',
  TRUE,
  FALSE,
  TRUE,
  1,
  1,
  3,
  NOW(),
  NOW()
FROM public.boards b
LEFT JOIN public.threads t ON t.board_id = b.id
WHERE t.id IS NULL
ORDER BY b.created_at;

INSERT INTO public.product_cards (
  creator_id,
  thread_id,
  name,
  description,
  price,
  category,
  image_url,
  external_link,
  verified_owner,
  save_count,
  click_count,
  purchase_count,
  usage_count,
  created_at,
  updated_at
)
SELECT
  t.author_id,
  t.id,
  'Starter resource',
  'A lightweight resource connected to the real user who owns this board.',
  0.00,
  'resource',
  NULL,
  NULL,
  FALSE,
  0,
  0,
  0,
  0,
  NOW(),
  NOW()
FROM public.threads t
LEFT JOIN public.product_cards pc ON pc.thread_id = t.id
WHERE pc.id IS NULL
ORDER BY t.created_at;

INSERT INTO public.pins (board_id, profile_id, created_at)
SELECT
  b.id,
  b.user_id,
  NOW()
FROM public.boards b
LEFT JOIN public.pins p ON p.board_id = b.id AND p.profile_id = b.user_id
WHERE p.id IS NULL;

COMMIT;
