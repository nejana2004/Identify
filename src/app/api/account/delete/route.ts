import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(request: NextRequest) {
  try {
    // Check if environment variables are set
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!serviceRoleKey 
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the user's token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    console.log('Deleting account for user:', userId);
    
    // Delete user's data from public tables first (ignore errors for tables that might not have data)
    // 1. Delete pins where user is the pinner
    const { error: pinsError1 } = await supabaseAdmin
      .from('pins')
      .delete()
      .eq('user_id', userId);
    if (pinsError1) console.log('Pins delete 1:', pinsError1.message);
    
    // 2. Delete pins where user is the profile being pinned
    const { error: pinsError2 } = await supabaseAdmin
      .from('pins')
      .delete()
      .eq('profile_id', userId);
    if (pinsError2) console.log('Pins delete 2:', pinsError2.message);
    
    // 3. Delete user's boards
    const { error: boardsError } = await supabaseAdmin
      .from('boards')
      .delete()
      .eq('user_id', userId);
    if (boardsError) console.log('Boards delete:', boardsError.message);
    
    // 4. Delete user's links
    const { error: linksError } = await supabaseAdmin
      .from('user_links')
      .delete()
      .eq('user_id', userId);
    if (linksError) console.log('Links delete:', linksError.message);
    
    // 5. Delete user from public.users table
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    if (usersError) console.log('Users delete:', usersError.message);
    
    // 6. Finally delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete account: ${deleteError.message}` },
        { status: 500 }
      );
    }
    
    console.log('Account deleted successfully:', userId);
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
