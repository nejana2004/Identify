"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FiArrowRight, FiHash, FiMessageCircle, FiPlus, FiSearch, FiShield } from 'react-icons/fi';

type Board = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  cover_image: string | null;
  pin_count: number;
  follower_count: number;
  owner: { username: string; name: string };
};

const categories = ['All', 'Tech & tools', 'Design & creativity', 'Productivity & work', 'Local places & services', 'Lifestyle & consumer products'];

export default function BoardsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [myBoards, setMyBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', is_public: true });

  useEffect(() => {
    async function loadBoards() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const { data: publicBoards } = await supabase
          .from('boards')
          .select('id, slug, title, description, created_at, cover_image, is_public, user_id')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(24);

        const publicList = await Promise.all((publicBoards || []).map(async (board) => {
          const [{ data: owner }, { count: pinCount }, { count: followerCount }] = await Promise.all([
            supabase.from('users').select('username, name').eq('id', board.user_id).maybeSingle(),
            supabase.from('pins').select('*', { count: 'exact', head: true }).eq('board_id', board.id),
            supabase.from('board_followers').select('*', { count: 'exact', head: true }).eq('board_id', board.id),
          ]);

          return {
            id: board.id,
            slug: board.slug,
            title: board.title,
            description: board.description,
            is_public: board.is_public,
            created_at: board.created_at,
            cover_image: board.cover_image,
            pin_count: pinCount || 0,
            follower_count: followerCount || 0,
            owner: owner || { username: 'unknown', name: 'Unknown' },
          };
        }));

        setBoards(publicList as Board[]);

        if (user) {
          const { data: ownedBoards } = await supabase
            .from('boards')
            .select('id, slug, title, description, created_at, cover_image, is_public, user_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(12);

          const ownedList = await Promise.all((ownedBoards || []).map(async (board) => {
            const [{ data: owner }, { count: pinCount }, { count: followerCount }] = await Promise.all([
              supabase.from('users').select('username, name').eq('id', board.user_id).maybeSingle(),
              supabase.from('pins').select('*', { count: 'exact', head: true }).eq('board_id', board.id),
              supabase.from('board_followers').select('*', { count: 'exact', head: true }).eq('board_id', board.id),
            ]);

            return {
              id: board.id,
              slug: board.slug,
              title: board.title,
              description: board.description,
              is_public: board.is_public,
              created_at: board.created_at,
              cover_image: board.cover_image,
              pin_count: pinCount || 0,
              follower_count: followerCount || 0,
              owner: owner || { username: 'unknown', name: 'Unknown' },
            };
          }));

          setMyBoards(ownedList as Board[]);
        }
      } catch (error) {
        console.error('Error loading boards:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBoards();
  }, []);

  const filteredBoards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return boards.filter((board) => {
      const matchesCategory = category === 'All' || board.description?.toLowerCase().includes(category.toLowerCase()) || board.title.toLowerCase().includes(category.toLowerCase());
      const matchesQuery = !normalizedQuery || [board.title, board.description, board.owner.username, board.owner.name].some((value) => value?.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [boards, category, query]);

  const handleCreateBoard = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!form.title.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({ user_id: user.id, title: form.title.trim(), description: form.description.trim() || null, is_public: form.is_public })
        .select('id, slug, title, description, created_at, cover_image, is_public, user_id')
        .single();
      if (error) throw error;

      const { data: owner } = await supabase.from('users').select('username, name').eq('id', user.id).maybeSingle();
      const newBoard = {
        id: data.id,
        slug: data.slug,
        title: data.title,
        description: data.description,
        is_public: data.is_public,
        created_at: data.created_at,
        cover_image: data.cover_image,
        pin_count: 0,
        follower_count: 0,
        owner: owner || { username: 'you', name: 'You' },
      };

      setMyBoards((prev) => [newBoard, ...prev]);
      setBoards((prev) => [newBoard, ...prev]);
      setForm({ title: '', description: '', is_public: true });
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5 rounded-[28px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Boards first</div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#F0F0F5] sm:text-4xl">Create topic boards for knowledge, products, places, and services.</h1>
          <p className="max-w-2xl text-sm leading-7 text-[#9CA3AF] sm:text-base">Keep the content simple: a board header, a threaded set of posts, attachable cards, and trust signals that let people decide what to save or follow.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Boards', 'Topic hubs with public or invite-only access', FiHash],
              ['Posts', 'Questions, answers, reviews, and recommendations', FiMessageCircle],
              ['Trust', 'Followers, saves, clicks, and verified owner badges', FiShield],
            ].map(([label, text, Icon]) => {
              const BoardIcon = Icon as any;
              return (
                <div key={label as string} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]"><BoardIcon className="h-4 w-4" /></div>
                  <div className="mt-3 text-sm font-semibold text-[#F0F0F5]">{label}</div>
                  <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">{text}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#0A0A0F] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Search the directory</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Discover what the community is building</h2>
            </div>
            <FiSearch className="h-5 w-5 text-[#9CA3AF]" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm transition ${category === item ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-white/[0.03] text-[#F0F0F5] hover:bg-white/[0.06]'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#12121A] p-3">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0A0A0F] px-4 py-3">
              <FiSearch className="h-5 w-5 text-[#9CA3AF]" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search boards, owners, and descriptions" className="w-full bg-transparent text-sm text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" />
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-[#12121A] p-4 text-sm text-[#9CA3AF]">
            <div className="flex items-center justify-between">
              <span>{boards.length} public boards</span>
              <span>{myBoards.length} boards you own</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/5">
              <div className="h-1.5 w-2/3 rounded-full bg-[#D4AF37]" />
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#6B7280]">Transparent trust signals replace an algorithmic feed.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Create board</p>
              <h3 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Start a new community board</h3>
            </div>
            <FiPlus className="h-5 w-5 text-[#D4AF37]" />
          </div>

          <form onSubmit={handleCreateBoard} className="mt-6 space-y-4">
            <Field label="Board title" value={form.title} onChange={(value) => setForm((prev) => ({ ...prev, title: value }))} placeholder="My first board" />
            <Field label="Description" textarea value={form.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} placeholder="A focused board for operators and platform teams." />
            <label className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-sm text-[#F0F0F5]">
              <input type="checkbox" checked={form.is_public} onChange={(event) => setForm((prev) => ({ ...prev, is_public: event.target.checked }))} className="h-4 w-4 rounded border-white/20 bg-transparent text-[#D4AF37]" />
              Public board
            </label>
            <button disabled={creating} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60">
              {creating ? 'Creating...' : 'Create board'} <FiArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">Your boards</h4>
            {myBoards.map((board) => <BoardCard key={board.id} board={board} />)}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Public boards</p>
            <h3 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Browse boards with proof attached</h3>
          </div>
          {loading ? (
            <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-sm text-[#9CA3AF]">Loading boards...</div>
          ) : filteredBoards.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-sm text-[#9CA3AF]">No boards found.</div>
          ) : (
            filteredBoards.map((board) => <BoardCard key={board.id} board={board} />)
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; textarea?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-28 w-full rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" />
      )}
    </div>
  );
}

function BoardCard({ board }: { board: Board }) {
  return (
    <Link href={`/b/${board.slug || board.id}`} className="block rounded-[28px] border border-white/10 bg-black/20 p-5 transition hover:border-[#D4AF37]/25 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37]">
            {board.is_public ? 'Public' : 'Invite only'}
            <span className="h-1 w-1 rounded-full bg-[#6B7280]" />
            @{board.owner.username}
          </div>
          <h4 className="mt-2 text-xl font-semibold text-[#F0F0F5]">{board.title}</h4>
          <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{board.description || 'No description yet.'}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#9CA3AF]">{board.pin_count} posts</div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-sm text-[#9CA3AF]">
        <span>{board.follower_count} followers</span>
        <span className="h-1 w-1 rounded-full bg-[#6B7280]" />
        <span>{board.owner.name}</span>
      </div>
    </Link>
  );
}
