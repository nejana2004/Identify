import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const username = (body.username as string | undefined)?.trim();
  const name = (body.name as string | undefined)?.trim();
  const bio = (body.bio as string | undefined)?.trim() || '';
  const country = (body.country as string | undefined) || 'Other';
  const tagsCreated = (body.tagsCreated as string[] | undefined) || [];

  if (!username || !name) {
    return NextResponse.json({ success: false, error: 'Username and name are required' }, { status: 400 });
  }

  // Reject if another user already owns this username.
  const { data: taken } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username)
    .neq('id', user.id)
    .maybeSingle();

  if (taken) {
    return NextResponse.json({ success: false, error: 'Username is already taken' }, { status: 409 });
  }

  const { error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert(
      {
        id: user.id,
        username,
        name,
        bio,
        country,
        tags_created: tagsCreated,
        onboarded_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (upsertError) {
    return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
