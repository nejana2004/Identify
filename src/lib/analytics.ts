import { supabase } from "@/lib/supabaseClient";

export async function trackProfileView(profileId: string) {
  // Increment views_count for the profile
  await supabase.rpc('increment_profile_views', { profile_id: profileId });
}

export async function trackProfilePin(profileId: string) {
  // Increment pinned_count for the profile
  await supabase.rpc('increment_profile_pins', { profile_id: profileId });
}

export async function getProfileGrowth(profileId: string) {
  // Fetch daily views and pins for growth chart
  const { data, error } = await supabase
    .from('profile_growth')
    .select('date, views, pins')
    .eq('profile_id', profileId)
    .order('date', { ascending: true });
  return { data, error };
}
