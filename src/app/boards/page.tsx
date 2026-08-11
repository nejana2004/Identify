"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CreateBoardModal from '@/components/CreateBoardModal';
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
  const [, setUser] = useState<{ id: string } | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [myBoards, setMyBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadBoards() {
      setLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

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

        if (authUser) {
          const { data: ownedBoards } = await supabase
            .from('boards')
            .select('id, slug, title, description, created_at, cover_image, is_public, user_id')
            .eq('user_id', authUser.id)
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4 rounded-[24px] border border-white/10 bg-[#12121A] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.28)] sm:space-y-5 sm:p-6 lg:rounded-[28px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Boards first</div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F0F0F5] sm:text-3xl lg:text-4xl">Create topic boards for knowledge, products, places, and services.</h1>
          <p className="max-w-2xl text-sm leading-6 text-[#9CA3AF] sm:text-base sm:leading-7">Keep the content simple: a board header, threaded posts, attachable cards, and trust signals that help people decide what to save or follow.</p>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Boards', 'Topic hubs with public or invite-only access', FiHash],
              ['Posts', 'Questions, answers, reviews, and recommendations', FiMessageCircle],
              ['Trust', 'Followers, saves, clicks, and verified owner badges', FiShield],
            ].map(([label, text, Icon]) => {
              const BoardIcon = Icon as React.ComponentType<{ className?: string }>;
              return (
                <div key={label as string} className="rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]"><BoardIcon className="h-4 w-4" /></div>
                  <div className="mt-3 text-sm font-semibold text-[#F0F0F5]">{label}</div>
                  <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">{text}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4 shadow-[0_24px_90px_rgba(0,0,0,0.3)] sm:p-5 lg:rounded-[28px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4AF37]">Search the directory</p>
              <h2 className="mt-2 text-xl font-semibold text-[#F0F0F5] sm:text-2xl">Discover what the community is building</h2>
            </div>
            <FiSearch className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-2 text-sm transition sm:px-4 ${category === item ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-white/[0.03] text-[#F0F0F5] hover:bg-white/[0.06]'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#12121A] p-3">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0A0A0F] px-4 py-3">
              <FiSearch className="h-4 w-4 shrink-0 text-[#9CA3AF] sm:h-5 sm:w-5" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search boards, owners, and descriptions" className="w-full bg-transparent text-sm text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" />
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/10 bg-[#12121A] p-4 text-sm text-[#9CA3AF]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{boards.length} public boards</span>
              <span>{myBoards.length} boards you own</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/5">
              <div className="h-1.5 w-2/3 rounded-full bg-[#D4AF37]" />
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[#6B7280]">Transparent trust signals replace an algorithmic feed.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
        <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-4 sm:p-6 lg:rounded-[28px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4AF37]">Create board</p>
              <h3 className="mt-2 text-xl font-semibold text-[#F0F0F5] sm:text-2xl">Start a new community board</h3>
            </div>
            <FiPlus className="h-5 w-5 shrink-0 text-[#D4AF37]" />
          </div>

          <button onClick={() => setShowCreateModal(true)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] sm:mt-6">
            Create board <FiArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-6 space-y-3 sm:mt-8">
            <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">Your boards</h4>
            {myBoards.map((board) => <BoardCard key={board.id} board={board} />)}
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-4 sm:p-6 lg:rounded-[28px]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#D4AF37]">Public boards</p>
            <h3 className="mt-2 text-xl font-semibold text-[#F0F0F5] sm:text-2xl">Browse boards with proof attached</h3>
          </div>
          {loading ? (
            <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-4 text-sm text-[#9CA3AF] sm:p-6 lg:rounded-[28px]">Loading boards...</div>
          ) : filteredBoards.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-4 text-sm text-[#9CA3AF] sm:p-6 lg:rounded-[28px]">No boards found.</div>
          ) : (
            filteredBoards.map((board) => <BoardCard key={board.id} board={board} />)
          )}
        </div>
      </section>

      <CreateBoardModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

function BoardCard({ board }: { board: Board }) {
  return (
    <Link href={`/b/${board.slug || board.id}`} className="block rounded-[22px] border border-white/10 bg-black/20 p-4 transition hover:border-[#D4AF37]/25 hover:bg-white/[0.04] sm:rounded-[24px] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#D4AF37]">
            {board.is_public ? 'Public' : 'Invite only'}
            <span className="h-1 w-1 rounded-full bg-[#6B7280]" />
            @{board.owner.username}
          </div>
          <h4 className="mt-2 text-lg font-semibold text-[#F0F0F5] sm:text-xl">{board.title}</h4>
          <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{board.description || 'No description yet.'}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#9CA3AF]">{board.pin_count} posts</div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#9CA3AF]">
        <span>{board.follower_count} followers</span>
        <span className="h-1 w-1 rounded-full bg-[#6B7280]" />
        <span>{board.owner.name}</span>
      </div>
    </Link>
  );
}
