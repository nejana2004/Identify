import { supabase } from "@/lib/supabaseClient";

export async function createBoard({ userId, title, description }: { userId: string; title: string; description: string }) {
  const { data, error } = await supabase.from("boards").insert([{ user_id: userId, title, description }]);
  return { data, error };
}

export async function getBoards(userId: string) {
  const { data, error } = await supabase.from("boards").select("id, title, description").eq("user_id", userId);
  return { data, error };
}

export async function getBoard(boardId: string) {
  const { data, error } = await supabase.from("boards").select("id, title, description, user_id").eq("id", boardId).single();
  return { data, error };
}
