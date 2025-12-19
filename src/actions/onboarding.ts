'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function serverSaveOnboarding({
  userId,
  username,
  name,
  bio,
  country,
  tagsCreated,
  tagsLiked
}: {
  userId: string;
  username: string;
  name: string;
  bio: string;
  country: string;
  tagsCreated: string[];
  tagsLiked: string[];
}) {
  try {
    // Try saving to profiles table with service role
    // This bypasses RLS because we're using the admin client
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    const profileData = {
      username,
      name,
      bio,
      metadata: { 
        country, 
        tags_created: tagsCreated, 
        tags_liked: tagsLiked 
      }
    };

    if (existingProfile) {
      // Update existing profile with admin privileges
      const { error } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('id', userId);
      
      if (error) throw error;
    } else {
      // Create new profile with admin privileges
      const { error } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          ...profileData
        });
      
      if (error) {
        // If profiles table doesn't exist, try users table
        const { error: usersError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: userId,
            username,
            name
          });
        
        if (usersError) throw usersError;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Server-side onboarding error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to save profile on server' 
    };
  }
}
