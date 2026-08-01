"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Board {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  pin_count?: number;
}

export default function BoardsSettingsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoard, setNewBoard] = useState({ title: '', description: '', is_public: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        setUser(user);

        const { data: boardsData, error: boardsError } = await supabase.from('boards').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (boardsError) throw boardsError;

        const boardsWithCounts = await Promise.all((boardsData || []).map(async (board) => {
          const { count } = await supabase.from('pins').select('*', { count: 'exact', head: true }).eq('board_id', board.id);
          return { ...board, pin_count: count || 0 };
        }));

        setBoards(boardsWithCounts);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setNewBoard((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setNewBoard((prev) => ({ ...prev, [name]: checked }));
  };

  const handleAddBoard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!newBoard.title.trim()) {
      setError('Board title is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.from('boards').insert({ user_id: user.id, title: newBoard.title.trim(), description: newBoard.description.trim() || null, is_public: newBoard.is_public }).select().single();
      if (error) throw error;
      setBoards([{ ...data, pin_count: 0 }, ...boards]);
      setNewBoard({ title: '', description: '', is_public: true });
      setSuccess('Board created successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoard = async (id: string) => {
    if (!confirm('Delete this board and all cards attached to it?')) return;
    const { error } = await supabase.from('boards').delete().eq('id', id);
    if (!error) setBoards(boards.filter((board) => board.id !== id));
  };

  const handleTogglePrivacy = async (id: string, isPublic: boolean) => {
    const { error } = await supabase.from('boards').update({ is_public: !isPublic }).eq('id', id);
    if (!error) setBoards(boards.map((board) => (board.id === id ? { ...board, is_public: !isPublic } : board)));
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-[#9CA3AF]">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Boards settings</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#F0F0F5]">Manage your board vault</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#9CA3AF]">Create and manage the boards you own from the same dark system used across the rest of the product.</p>

        {error && <div className="mt-6 rounded-2xl border border-[#EF4444]/25 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">{error}</div>}
        {success && <div className="mt-6 rounded-2xl border border-[#10B981]/25 bg-[#10B981]/10 p-4 text-sm text-[#A7F3D0]">{success}</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <form onSubmit={handleAddBoard} className="rounded-[28px] border border-white/10 bg-black/20 p-5 space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Create board</p>
            <Field label="Board title" name="title" value={newBoard.title} onChange={handleInputChange} />
            <Field label="Description" name="description" value={newBoard.description} onChange={handleInputChange} textarea />
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-sm text-[#F0F0F5]">
              <input type="checkbox" name="is_public" checked={newBoard.is_public} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-white/20 bg-transparent text-[#D4AF37]" />
              Public board
            </label>
            <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60">
              {saving ? 'Creating...' : 'Create board'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Your boards</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Published and private boards</h2>
            </div>
            {boards.length === 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-sm text-[#9CA3AF]">You haven't created any boards yet.</div>
            ) : (
              <div className="grid gap-4">
                {boards.map((board) => (
                  <div key={board.id} className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">{board.is_public ? 'Public' : 'Invite only'}</div>
                        <div className="mt-2 text-xl font-semibold text-[#F0F0F5]">{board.title}</div>
                        <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{board.description || 'No description yet.'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleTogglePrivacy(board.id, board.is_public)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#F0F0F5]">{board.is_public ? 'Make private' : 'Make public'}</button>
                        <button onClick={() => handleDeleteBoard(board.id)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#F0F0F5]">Delete</button>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-[#9CA3AF]">{board.pin_count} cards attached</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, textarea = false }: { label: string; name: string; value: string; onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; textarea?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">{label}</label>
      {textarea ? <textarea name={name} value={value} onChange={onChange} className="min-h-28 w-full rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none" /> : <input name={name} value={value} onChange={onChange} className="w-full rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none" />}
    </div>
  );
}
