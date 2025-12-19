-- Add platform_id column to user_links table
ALTER TABLE public.user_links ADD COLUMN IF NOT EXISTS platform_id TEXT;

-- Add index to improve performance
CREATE INDEX IF NOT EXISTS user_links_platform_id_idx ON public.user_links (platform_id);

-- Update existing rows to set platform_id based on icons
UPDATE public.user_links SET platform_id = 'website' WHERE icon = '🌐';
UPDATE public.user_links SET platform_id = 'instagram' WHERE icon = '📷';
UPDATE public.user_links SET platform_id = 'twitter' WHERE icon = '🐦';
UPDATE public.user_links SET platform_id = 'tiktok' WHERE icon = '🎵';
UPDATE public.user_links SET platform_id = 'youtube' WHERE icon = '📺';
UPDATE public.user_links SET platform_id = 'linkedin' WHERE icon = '💼';
UPDATE public.user_links SET platform_id = 'github' WHERE icon = '💻';
UPDATE public.user_links SET platform_id = 'facebook' WHERE icon = '👥';
UPDATE public.user_links SET platform_id = 'discord' WHERE icon = '🎮';
UPDATE public.user_links SET platform_id = 'twitch' WHERE icon = '🎮';
UPDATE public.user_links SET platform_id = 'spotify' WHERE icon = '🎶';
UPDATE public.user_links SET platform_id = 'pinterest' WHERE icon = '📌';
UPDATE public.user_links SET platform_id = 'snapchat' WHERE icon = '👻';
UPDATE public.user_links SET platform_id = 'reddit' WHERE icon = '🤖';
UPDATE public.user_links SET platform_id = 'medium' WHERE icon = '✍️';
UPDATE public.user_links SET platform_id = 'behance' WHERE icon = '🎨';
UPDATE public.user_links SET platform_id = 'dribbble' WHERE icon = '🏀';
UPDATE public.user_links SET platform_id = 'custom' WHERE icon = '🔗';

-- Set platform_id to 'custom' for any remaining rows without a platform_id
UPDATE public.user_links SET platform_id = 'custom' WHERE platform_id IS NULL;