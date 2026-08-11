"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowRight } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import SimpleModal from '@/components/SimpleModal';

export default function CreateBoardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', is_public: true });

  async function handleCreateBoard(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!form.title.trim()) {
      setError('Board title is required.');
      return;
    }

    setCreating(true);
    try {
      const { data, error: insertError } = await supabase
        .from('boards')
        .insert({ user_id: user.id, title: form.title.trim(), description: form.description.trim() || null, is_public: form.is_public })
        .select('id')
        .single();

      if (insertError || !data) {
        throw insertError || new Error('Failed to create board.');
      }

      setForm({ title: '', description: '', is_public: true });
      onClose();
      router.push(`/boards/${data.id}`);
    } catch (createError: any) {
      setError(createError?.message || 'Failed to create board.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SimpleModal open={open} onClose={onClose} title="Create a board" description="Start a public or private page around something you know and recommend.">
      <form onSubmit={handleCreateBoard} className="space-y-4">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">Board title</label>
          <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0B0B] px-3 text-sm text-[#F0F0F5] outline-none" placeholder="My favorite cafes in Colombo" />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">Description</label>
          <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-28 w-full rounded-xl border border-white/10 bg-[#0B0B0B] px-3 py-3 text-sm text-[#F0F0F5] outline-none" placeholder="What this page is about and why it is useful." />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B0B0B] px-4 py-3 text-sm text-[#F0F0F5]">
          <input type="checkbox" checked={form.is_public} onChange={(event) => setForm((current) => ({ ...current, is_public: event.target.checked }))} className="h-4 w-4 rounded border-white/20 bg-transparent" />
          Public page
        </label>

        {error ? <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

        <button disabled={creating} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">
          {creating ? 'Creating...' : 'Create board'} <FiArrowRight className="h-4 w-4" />
        </button>
      </form>
    </SimpleModal>
  );
}