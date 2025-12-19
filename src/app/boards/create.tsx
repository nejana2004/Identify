import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createBoard } from "@/lib/boards";
import { useRouter } from "next/navigation";

export default function CreateBoard() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("User not authenticated.");
      setLoading(false);
      return;
    }
    const { error: boardError } = await createBoard({
      userId: user.id,
      title,
      description
    });
    if (boardError) {
      setError(boardError.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push("/boards"); // Redirect to boards list
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Create Board</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Board Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
        />
        {error && <div className="text-red-500">{error}</div>}
        <button type="submit" className="w-full bg-black text-white py-2 rounded" disabled={loading}>
          {loading ? "Creating..." : "Create Board"}
        </button>
      </form>
    </div>
  );
}
