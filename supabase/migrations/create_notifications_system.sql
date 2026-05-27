-- Notifications System Tables
-- This creates tables for notifications and board invitations

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'profile_view', 'pin', 'board_invite', 'join_request', 'invite_accepted', 'request_approved'
  title TEXT NOT NULL,
  message TEXT,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Board Invitations Table
CREATE TABLE IF NOT EXISTS board_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL if invite link
  invite_code TEXT UNIQUE, -- For shareable invite links
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- 3. Board Join Requests Table
CREATE TABLE IF NOT EXISTS board_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  message TEXT, -- Optional message from requester
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(board_id, user_id)
);

-- 4. Board Members Table (for collaborative boards)
CREATE TABLE IF NOT EXISTS board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_board_invitations_board_id ON board_invitations(board_id);
CREATE INDEX IF NOT EXISTS idx_board_invitations_invite_code ON board_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_board_join_requests_board_id ON board_join_requests(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_board_id ON board_members(board_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

-- RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Board Invitations: Board owners can manage, invited users can view
CREATE POLICY "Board owners can manage invitations" ON board_invitations
  FOR ALL USING (
    auth.uid() = invited_by OR 
    auth.uid() = invited_user_id
  );

CREATE POLICY "Anyone can view invite by code" ON board_invitations
  FOR SELECT USING (invite_code IS NOT NULL);

-- Board Join Requests: Board owners and requesters can view
DROP POLICY IF EXISTS "View join requests" ON board_join_requests;
CREATE POLICY "View join requests" ON board_join_requests
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT user_id FROM boards WHERE id = board_id)
  );

DROP POLICY IF EXISTS "Users can create join requests" ON board_join_requests;
CREATE POLICY "Users can create join requests" ON board_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Board owners can update requests" ON board_join_requests;
CREATE POLICY "Board owners can update requests" ON board_join_requests
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM boards WHERE id = board_id)
  );

-- Allow users to check their own request status
DROP POLICY IF EXISTS "Users can view own requests" ON board_join_requests;
CREATE POLICY "Users can view own requests" ON board_join_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Board Members: Members can view, owners can manage
DROP POLICY IF EXISTS "View board members" ON board_members;
CREATE POLICY "View board members" ON board_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage board members" ON board_members;
CREATE POLICY "Manage board members" ON board_members
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM boards WHERE id = board_id) OR
    auth.uid() = user_id
  );

-- Allow users to check if they are a member
DROP POLICY IF EXISTS "Users can view own membership" ON board_members;
CREATE POLICY "Users can view own membership" ON board_members
  FOR SELECT USING (auth.uid() = user_id);

-- Function to create notification when someone views a profile
CREATE OR REPLACE FUNCTION notify_profile_view()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't notify for self-views
  IF NEW.viewer_id IS NOT NULL AND NEW.viewer_id != NEW.profile_id THEN
    INSERT INTO notifications (user_id, type, title, message, from_user_id)
    VALUES (
      NEW.profile_id,
      'profile_view',
      'Someone viewed your profile',
      'A user viewed your profile',
      NEW.viewer_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification when someone pins a profile
CREATE OR REPLACE FUNCTION notify_pin()
RETURNS TRIGGER AS $$
DECLARE
  board_title TEXT;
  pinner_name TEXT;
BEGIN
  SELECT title INTO board_title FROM boards WHERE id = NEW.board_id;
  SELECT name INTO pinner_name FROM users WHERE id = (SELECT user_id FROM boards WHERE id = NEW.board_id);
  
  INSERT INTO notifications (user_id, type, title, message, from_user_id, board_id)
  VALUES (
    NEW.profile_id,
    'pin',
    'You were pinned to a board!',
    pinner_name || ' pinned you to "' || board_title || '"',
    (SELECT user_id FROM boards WHERE id = NEW.board_id),
    NEW.board_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for pin notifications
DROP TRIGGER IF EXISTS trigger_notify_pin ON pins;
CREATE TRIGGER trigger_notify_pin
  AFTER INSERT ON pins
  FOR EACH ROW
  EXECUTE FUNCTION notify_pin();

-- Grant access to roles for Data API
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;

GRANT SELECT ON public.board_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_invitations TO service_role;

GRANT SELECT ON public.board_join_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_join_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_join_requests TO service_role;

GRANT SELECT ON public.board_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_members TO service_role;
