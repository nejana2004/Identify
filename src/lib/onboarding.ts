import { supabase } from '@/lib/supabaseClient';

export async function saveOnboarding({
  userId,
  username,
  name,
  bio,
  country,
  tagsCreated,
  tagsLiked,
}: {
  userId: string;
  username: string;
  name: string;
  bio: string;
  country: string;
  tagsCreated: string[];
  tagsLiked: string[];
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: new Error('Not authenticated') };

  const response = await fetch('/api/onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId, username, name, bio, country, tagsCreated, tagsLiked }),
  });

  const json = await response.json() as { success: boolean; error?: string };
  if (!json.success) return { error: new Error(json.error || 'Failed to save onboarding') };
  return { error: null };
}
