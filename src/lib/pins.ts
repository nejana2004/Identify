import { supabase } from "@/lib/supabaseClient";

export async function pinProfile({ boardId, profileId }: { boardId: string; profileId: string }) {
  const { data, error } = await supabase.from("pins").insert([{ board_id: boardId, profile_id: profileId }]);
  return { data, error };
}

export async function getUserBoards(userId: string) {
  const { data, error } = await supabase.from("boards").select("id, title").eq("user_id", userId);
  return { data, error };
}
