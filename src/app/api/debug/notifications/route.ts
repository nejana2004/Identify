import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get all notifications
    const { data: notifications, error: notifError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get all join requests
    const { data: requests, error: reqError } = await supabaseAdmin
      .from('board_join_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get all board invitations
    const { data: invitations, error: invError } = await supabaseAdmin
      .from('board_invitations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get all board members
    const { data: members, error: memberError } = await supabaseAdmin
      .from('board_members')
      .select('*')
      .order('joined_at', { ascending: false })
      .limit(20);

    // Get pins for the test board
    const { data: pins, error: pinsError } = await supabaseAdmin
      .from('pins')
      .select('*')
      .eq('board_id', '8eeeb944-5dff-4f3c-a435-b572cf5bce47')
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      notifications: { data: notifications, error: notifError },
      requests: { data: requests, error: reqError },
      invitations: { data: invitations, error: invError },
      members: { data: members, error: memberError },
      pins: { data: pins, error: pinsError }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create a test notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, boardId, ownerId, requesterId } = body;

    if (action === 'reset_for_test') {
      // Delete member and request to allow re-testing
      const testUserId = userId || requesterId;
      
      const { error: memberDelError } = await supabaseAdmin
        .from('board_members')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', testUserId);
      
      const { error: reqDelError } = await supabaseAdmin
        .from('board_join_requests')
        .delete()
        .eq('board_id', boardId)
        .eq('user_id', testUserId);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Membership and request deleted for testing',
        memberDelError,
        reqDelError,
        deletedFor: testUserId
      });
    }

    if (action === 'test_pin') {
      // Directly test inserting a pin - first check if exists
      const { data: existing } = await supabaseAdmin
        .from('pins')
        .select('id')
        .eq('board_id', boardId)
        .eq('profile_id', requesterId || userId)
        .maybeSingle();
      
      if (existing) {
        return NextResponse.json({ success: true, message: 'Pin already exists', pinData: existing });
      }

      const { data: pinData, error: pinError } = await supabaseAdmin
        .from('pins')
        .insert({
          board_id: boardId,
          profile_id: requesterId || userId
        })
        .select()
        .single();
      
      return NextResponse.json({ success: !pinError, pinData, pinError });
    }

    if (action === 'test_respond') {
      // Test the respond_request flow directly
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/boards/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_request',
          boardId,
          requesterId,
          approved: true,
          ownerId
        })
      });
      const result = await response.json();
      return NextResponse.json({ success: true, respondResult: result });
    }

    if (action === 'test_join_request') {
      // Create a test join request
      const { data: request, error: reqError } = await supabaseAdmin
        .from('board_join_requests')
        .insert({
          board_id: boardId,
          user_id: requesterId,
          status: 'pending',
          message: 'Test join request'
        })
        .select()
        .single();

      if (reqError) {
        return NextResponse.json({ success: false, error: reqError });
      }

      // Create notification for owner
      const { data: notif, error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: ownerId,
          type: 'join_request',
          title: 'New join request!',
          message: 'Test user wants to join your board',
          from_user_id: requesterId,
          board_id: boardId
        })
        .select()
        .single();

      return NextResponse.json({ success: true, request, notification: notif, notifError });
    }

    // Default: create test notification
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'join_request',
        title: 'Test notification',
        message: 'This is a test notification',
        from_user_id: userId,
        board_id: boardId
      })
      .select()
      .single();

    return NextResponse.json({ success: !error, data, error });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
