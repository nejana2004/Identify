-- Board Followers Table
-- Allows users to follow boards for social proof and discovery

-- 1. Board Followers Table
CREATE TABLE IF NOT EXISTS board_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_board_followers_board_id ON board_followers(board_id);
CREATE INDEX IF NOT EXISTS idx_board_followers_user_id ON board_followers(user_id);

-- RLS Policies
ALTER TABLE board_followers ENABLE ROW LEVEL SECURITY;

-- Anyone can view follower counts
DROP POLICY IF EXISTS "Anyone can view board followers" ON board_followers;
CREATE POLICY "Anyone can view board followers" ON board_followers
  FOR SELECT USING (true);

-- Users can follow/unfollow boards
DROP POLICY IF EXISTS "Users can follow boards" ON board_followers;
CREATE POLICY "Users can follow boards" ON board_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unfollow boards" ON board_followers;
CREATE POLICY "Users can unfollow boards" ON board_followers
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get follower count for a board
CREATE OR REPLACE FUNCTION get_board_follower_count(board_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM board_followers WHERE board_id = board_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification when someone follows a board
CREATE OR REPLACE FUNCTION notify_board_follow()
RETURNS TRIGGER AS $$
DECLARE
  board_title TEXT;
  board_owner_id UUID;
  follower_name TEXT;
BEGIN
  SELECT title, user_id INTO board_title, board_owner_id FROM boards WHERE id = NEW.board_id;
  SELECT name INTO follower_name FROM users WHERE id = NEW.user_id;
  
  -- Don't notify if owner follows their own board
  IF NEW.user_id != board_owner_id THEN
    INSERT INTO notifications (user_id, type, title, message, from_user_id, board_id)
    VALUES (
      board_owner_id,
      'board_follow',
      'Someone followed your board!',
      follower_name || ' is now following "' || board_title || '"',
      NEW.user_id,
      NEW.board_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for board follow notifications
DROP TRIGGER IF EXISTS trigger_notify_board_follow ON board_followers;
CREATE TRIGGER trigger_notify_board_follow
  AFTER INSERT ON board_followers
  FOR EACH ROW
  EXECUTE FUNCTION notify_board_follow();

-- Grant access to roles for Data API
GRANT SELECT ON public.board_followers TO anon;
GRANT SELECT ON public.board_followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_followers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_followers TO service_role;
