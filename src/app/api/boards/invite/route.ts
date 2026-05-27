import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate a random invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, boardId, userId, inviterId, inviteCode, message } = body;

    switch (action) {
      case 'create_invite': {
        // Create a shareable invite link
        const code = generateInviteCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        // Use inviterId if provided, otherwise fall back to userId
        const creatorId = inviterId || userId;
        
        if (!creatorId) {
          return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
          .from('board_invitations')
          .insert({
            board_id: boardId,
            invited_by: creatorId,
            invite_code: code,
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({ 
          success: true, 
          inviteCode: code,
          inviteLink: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://identify.ink'}/boards/join/${code}`
        });
      }

      case 'accept_invite': {
        // Accept an invite by code - creates a PENDING request for owner approval
        const { data: invite, error: inviteError } = await supabaseAdmin
          .from('board_invitations')
          .select('*')
          .eq('invite_code', inviteCode)
          .eq('status', 'pending')
          .single();

        console.log('Invite lookup:', { invite, inviteError, inviteCode });

        if (inviteError || !invite) {
          return NextResponse.json({ success: false, error: 'Invalid or expired invite' }, { status: 400 });
        }

        // Check if expired
        if (new Date(invite.expires_at) < new Date()) {
          await supabaseAdmin
            .from('board_invitations')
            .update({ status: 'expired' })
            .eq('id', invite.id);
          return NextResponse.json({ success: false, error: 'Invite has expired' }, { status: 400 });
        }

        const theBoardId = invite.board_id;

        // Fetch board data separately to get owner
        const { data: boardData, error: boardError } = await supabaseAdmin
          .from('boards')
          .select('id, title, user_id')
          .eq('id', theBoardId)
          .single();

        console.log('Board lookup:', { boardData, boardError });

        if (boardError || !boardData) {
          return NextResponse.json({ success: false, error: 'Board not found' }, { status: 404 });
        }

        const boardOwnerId = boardData.user_id;
        const boardTitle = boardData.title;

        console.log('Board data:', { boardOwnerId, boardTitle, theBoardId, userId });

        // Check if user is the board owner
        if (boardOwnerId === userId) {
          return NextResponse.json({ success: true, boardId: theBoardId, message: 'You are the owner' });
        }

        // Check if already a member
        const { data: existingMember } = await supabaseAdmin
          .from('board_members')
          .select('id')
          .eq('board_id', theBoardId)
          .eq('user_id', userId)
          .single();

        if (existingMember) {
          return NextResponse.json({ success: true, boardId: theBoardId, message: 'Already a member' });
        }

        // Check if already has pending request
        const { data: existingRequest } = await supabaseAdmin
          .from('board_join_requests')
          .select('id, status')
          .eq('board_id', theBoardId)
          .eq('user_id', userId)
          .single();

        if (existingRequest) {
          if (existingRequest.status === 'pending') {
            return NextResponse.json({ 
              success: true, 
              boardId: theBoardId,
              pending: true,
              message: 'You already have a pending request.'
            });
          }
          // Update existing rejected request to pending
          await supabaseAdmin
            .from('board_join_requests')
            .update({ status: 'pending', responded_at: null })
            .eq('id', existingRequest.id);
        } else {
          // Create new join request
          const { error: requestError } = await supabaseAdmin
            .from('board_join_requests')
            .insert({
              board_id: theBoardId,
              user_id: userId,
              status: 'pending',
              message: 'Joined via invite link'
            });

          console.log('Join request created:', { requestError });

          if (requestError) {
            console.error('Request error:', requestError);
            return NextResponse.json({ success: false, error: 'Failed to create request: ' + requestError.message }, { status: 500 });
          }
        }

        // Update invite to track who used it
        await supabaseAdmin
          .from('board_invitations')
          .update({ invited_user_id: userId })
          .eq('id', invite.id);

        // Get requester info for notification
        const { data: requesterInfo } = await supabaseAdmin
          .from('users')
          .select('name, username')
          .eq('id', userId)
          .single();

        console.log('Creating notification for owner:', boardOwnerId, 'from user:', userId);

        // Notify board owner about the request
        const { data: notifData, error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: boardOwnerId,
            type: 'join_request',
            title: 'New join request!',
            message: `${requesterInfo?.name || 'Someone'} wants to join "${boardTitle}"`,
            from_user_id: userId,
            board_id: theBoardId
          })
          .select()
          .single();

        console.log('Notification result:', { notifData, notifError });

        if (notifError) {
          console.error('Notification error:', notifError);
        }

        return NextResponse.json({ 
          success: true, 
          boardId: theBoardId,
          pending: true,
          message: 'Request sent! Waiting for owner approval.'
        });
      }

      case 'request_join': {
        // Request to join a board
        // First check for existing request
        const { data: existingRequest } = await supabaseAdmin
          .from('board_join_requests')
          .select()
          .eq('board_id', boardId)
          .eq('user_id', userId)
          .maybeSingle();

        if (existingRequest) {
          // If previous request was rejected or approved (and user left/was removed), allow re-request
          if (existingRequest.status === 'pending') {
            return NextResponse.json({ success: false, error: 'Request already pending' }, { status: 400 });
          }
          // Delete old request to allow new one
          await supabaseAdmin
            .from('board_join_requests')
            .delete()
            .eq('id', existingRequest.id);
        }

        const { error: requestError } = await supabaseAdmin
          .from('board_join_requests')
          .insert({
            board_id: boardId,
            user_id: userId,
            status: 'pending',
            message: message || null
          });

        if (requestError) throw requestError;

        // Get board owner and notify them
        const { data: board } = await supabaseAdmin
          .from('boards')
          .select('user_id, title')
          .eq('id', boardId)
          .single();

        if (board) {
          // Get requester info
          const { data: requesterInfo } = await supabaseAdmin
            .from('users')
            .select('name')
            .eq('id', userId)
            .single();

          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: board.user_id,
              type: 'join_request',
              title: 'New join request',
              message: `${requesterInfo?.name || 'Someone'} wants to join "${board.title}"`,
              from_user_id: userId,
              board_id: boardId
            });
        }

        return NextResponse.json({ success: true });
      }

      case 'leave_board': {
        // User wants to leave a board (remove their own pin)
        console.log('leave_board called:', { boardId, userId });

        // Remove from pins
        const { error: pinError } = await supabaseAdmin
          .from('pins')
          .delete()
          .eq('board_id', boardId)
          .eq('profile_id', userId);

        console.log('Pin deleted:', { pinError });

        // Remove from board_members
        const { error: memberError } = await supabaseAdmin
          .from('board_members')
          .delete()
          .eq('board_id', boardId)
          .eq('user_id', userId);

        console.log('Member deleted:', { memberError });

        // Clear any join requests so they can rejoin later
        await supabaseAdmin
          .from('board_join_requests')
          .delete()
          .eq('board_id', boardId)
          .eq('user_id', userId);

        return NextResponse.json({ success: true });
      }

      case 'respond_request': {
        const { requestId, approved, requesterId, ownerId } = body;

        console.log('=== RESPOND_REQUEST START ===');
        console.log('Params:', { requestId, approved, requesterId, ownerId, boardId });

        // Find the join request
        let request: any = null;
        
        if (boardId && requesterId) {
          // Find by boardId + requesterId (most common case from notifications)
          const { data, error } = await supabaseAdmin
            .from('board_join_requests')
            .select('*')
            .eq('board_id', boardId)
            .eq('user_id', requesterId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          console.log('Found request by boardId+requesterId:', { data, error });
          request = data;
        } else if (requestId) {
          const { data, error } = await supabaseAdmin
            .from('board_join_requests')
            .select('*')
            .eq('id', requestId)
            .single();
          
          console.log('Found request by ID:', { data, error });
          request = data;
        }

        if (!request) {
          console.log('ERROR: Request not found');
          return NextResponse.json({ success: false, error: 'Join request not found' }, { status: 404 });
        }

        console.log('Processing request:', request);

        // Get board info
        const { data: boardData, error: boardError } = await supabaseAdmin
          .from('boards')
          .select('id, title, user_id')
          .eq('id', request.board_id)
          .single();

        console.log('Board data:', { boardData, boardError });

        if (!boardData) {
          return NextResponse.json({ success: false, error: 'Board not found' }, { status: 404 });
        }

        // Verify responder is the board owner
        const responderId = ownerId || userId;
        console.log('Auth check:', { boardOwner: boardData.user_id, responder: responderId });
        
        if (boardData.user_id !== responderId) {
          console.log('ERROR: Unauthorized - not board owner');
          return NextResponse.json({ success: false, error: 'Only board owner can respond' }, { status: 403 });
        }

        // Update the request status
        const newStatus = approved ? 'approved' : 'rejected';
        const { error: updateError } = await supabaseAdmin
          .from('board_join_requests')
          .update({
            status: newStatus,
            responded_at: new Date().toISOString()
          })
          .eq('id', request.id);

        console.log('Updated request status to:', newStatus, 'Error:', updateError);

        // If approved, PIN the user to the board (add to pins table)
        if (approved) {
          console.log('Pinning user to board:', { board_id: request.board_id, profile_id: request.user_id });
          
          // Check if already pinned
          const { data: existingPin } = await supabaseAdmin
            .from('pins')
            .select('id')
            .eq('board_id', request.board_id)
            .eq('profile_id', request.user_id)
            .maybeSingle();
          
          if (existingPin) {
            console.log('User already pinned to board');
          } else {
            // Add to pins table - this is what displays the user on the board
            const { data: pinData, error: pinError } = await supabaseAdmin
              .from('pins')
              .insert({
                board_id: request.board_id,
                profile_id: request.user_id
              })
              .select()
              .single();

            console.log('Pin insert result:', { pinData, pinError });

            if (pinError) {
              console.error('FAILED to pin user:', pinError);
            } else {
              console.log('SUCCESS: User pinned to board!');
            }
          }

          // Also add as board member for access (optional)
          const { data: existingMember } = await supabaseAdmin
            .from('board_members')
            .select('id')
            .eq('board_id', request.board_id)
            .eq('user_id', request.user_id)
            .maybeSingle();

          if (!existingMember) {
            await supabaseAdmin
              .from('board_members')
              .insert({
                board_id: request.board_id,
                user_id: request.user_id,
                role: 'member'
              });
          }
        }

        // Send notification to the requester
        const { data: notifData, error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: request.user_id,
            type: approved ? 'request_approved' : 'request_rejected',
            title: approved ? 'Join request approved!' : 'Join request declined',
            message: approved 
              ? `You've been pinned to "${boardData.title}"`
              : `Your request to join "${boardData.title}" was declined`,
            from_user_id: responderId,
            board_id: request.board_id
          })
          .select()
          .single();

        console.log('Notification sent:', { notifData, notifError });
        console.log('=== RESPOND_REQUEST END ===');

        return NextResponse.json({ 
          success: true, 
          approved,
          memberId: approved ? request.user_id : null
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Board invite error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ success: false, error: 'Missing invite code' }, { status: 400 });
  }

  try {
    const { data: invite, error } = await supabaseAdmin
      .from('board_invitations')
      .select(`
        *,
        board:boards(id, title, description, cover_image, user:users(name, username, profile_photo))
      `)
      .eq('invite_code', code)
      .single();

    if (error || !invite) {
      return NextResponse.json({ success: false, error: 'Invalid invite code' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ success: false, error: `Invite is ${invite.status}` }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'Invite has expired' }, { status: 400 });
    }

    return NextResponse.json({ success: true, invite });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
