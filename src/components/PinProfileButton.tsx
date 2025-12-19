"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { pinProfile, getUserBoards } from "@/lib/pins";

export default function PinProfileButton({ profileId }: { profileId: string }) {
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoard, setSelectedBoard] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchBoards() {
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();
      if (authError || !user) return;
      const { data } = await getUserBoards(user.id);
      setBoards(data || []);
    }
    fetchBoards();
  }, []);

  const handlePin = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    if (!selectedBoard) {
      setError("Select a board first.");
      setLoading(false);
      return;
    }
    const { error: pinError } = await pinProfile({ boardId: selectedBoard, profileId });
    if (pinError) {
      setError(pinError.message);
      setLoading(false);
      return;
    }
    setSuccess("Profile pinned!");
    setLoading(false);
  };

  return (
    <div className="mb-6">
      <label className="block mb-2 font-semibold">Pin this profile to a board:</label>
      <select
        value={selectedBoard}
        onChange={e => setSelectedBoard(e.target.value)}
        className="border p-2 rounded w-full mb-2"
      >
        <option value="">Select Board</option>
        {boards.map(board => (
          <option key={board.id} value={board.id}>{board.title}</option>
        ))}
      </select>
      <button
        onClick={handlePin}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full"
        disabled={loading}
      >
        {loading ? "Pinning..." : "Pin Profile"}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      {success && <div className="text-green-500 mt-2">{success}</div>}
    </div>
  );
}