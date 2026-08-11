"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiBookmark, FiEye, FiHash, FiSearch, FiTrendingUp, FiUser } from 'react-icons/fi';
import { incrementCardClick } from '@/lib/engagement';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';

type BoardRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  user_id: string;
  is_public: boolean;
  topic_tags: string[] | null;
  created_at: string;
};

type ThreadRow = {
  id: string;
  board_id: string;
  author_id: string;
  title: string;
  body: string;
  save_count: number;
  view_count: number;
  click_count: number;
  created_at: string;
};

type CardRow = {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  external_link: string | null;
  thread_id: string | null;
  created_at: string;
  save_count: number;
  click_count: number;
};

type UserRow = {
  id: string;
  username: string | null;
  name: string | null;
};

const topicOptions = ['All', 'Software Engineering', 'Design & UI', 'DevOps & Cloud', 'Audio & Music', 'Finance', 'Fitness', 'Food & Dining', 'Photography', 'Travel'];

export default function DiscoverPage() {
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDiscover() {
      setLoading(true);
      try {
        const [boardsRes, threadsRes, cardsRes, usersRes] = await Promise.all([
          supabase.from('boards').select('id, title, description, slug, user_id, is_public, topic_tags, created_at').eq('is_public', true).order('created_at', { ascending: false }).limit(30),
          supabase.from('threads').select('id, board_id, author_id, title, body, save_count, view_count, click_count, created_at').order('created_at', { ascending: false }).limit(50),
          supabase.from('product_cards').select('id, creator_id, name, description, category, price, external_link, thread_id, created_at, save_count, click_count').order('created_at', { ascending: false }).limit(100),
          supabase.from('users').select('id, username, name').order('created_at', { ascending: false }).limit(50),
        ]);

        setBoards((boardsRes.data || []) as BoardRow[]);
        setThreads((threadsRes.data || []) as ThreadRow[]);
        setUsers((usersRes.data || []) as UserRow[]);

        const seen = new Set<string>();
        const uniqueCards = ((cardsRes.data || []) as CardRow[]).filter((card) => {
          const key = `${card.creator_id}|${card.external_link || ''}|${card.name.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCards(uniqueCards);
      } finally {
        setLoading(false);
      }
    }

    loadDiscover();
  }, []);

  const boardById = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const filteredBoards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return boards.filter((board) => {
      const topicMatch = topic === 'All' || (board.topic_tags || []).some((tag) => tag.toLowerCase().includes(topic.toLowerCase()));
      const queryMatch = !normalized || `${board.title} ${board.description || ''} ${(board.topic_tags || []).join(' ')}`.toLowerCase().includes(normalized);
      return topicMatch && queryMatch;
    });
  }, [boards, query, topic]);

  const visibleThreads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return threads.filter((thread) => {
      const board = boardById.get(thread.board_id);
      if (!board || !board.is_public) return false;
      return !normalized || `${thread.title} ${thread.body}`.toLowerCase().includes(normalized);
    }).slice(0, 8);
  }, [threads, boardById, query]);

  const visibleCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cards.filter((card) => !normalized || `${card.name} ${card.description || ''} ${card.category}`.toLowerCase().includes(normalized)).slice(0, 8);
  }, [cards, query]);

  const topContributors = useMemo(() => {
    return users
      .map((user) => {
        const totalSaves = threads.filter((thread) => thread.author_id === user.id).reduce((sum, thread) => sum + thread.save_count, 0)
          + cards.filter((card) => card.creator_id === user.id).reduce((sum, card) => sum + card.save_count, 0);
        return { user, totalSaves };
      })
      .sort((a, b) => b.totalSaves - a.totalSaves)
      .slice(0, 5);
  }, [users, threads, cards]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-[14px] border border-white/10 bg-[#111111] p-4">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0B0B0B] px-4 py-3">
          <FiSearch className="h-5 w-5 text-[#9CA3AF]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search boards, discussions, and attached recommendations" className="w-full bg-transparent text-sm text-[#F0F0F5] outline-none placeholder:text-[#6B7280]" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {topicOptions.map((option) => (
            <button key={option} onClick={() => setTopic(option)} className={`rounded-full px-3 py-1.5 text-sm ${topic === option ? 'bg-[#D4AF37] text-black' : 'border border-white/10 bg-[#171717] text-[#D7D7D7]'}`}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37]"><FiHash className="h-4 w-4" /> Boards</div>
            <div className="space-y-3">
              {loading ? <Panel text="Loading boards..." /> : filteredBoards.length === 0 ? <Panel text="No boards found yet." /> : filteredBoards.slice(0, 8).map((board) => (
                <Link key={board.id} href={`/b/${board.slug || slugify(board.title)}`} className="block rounded-[12px] border border-white/10 bg-[#121212] p-4 hover:border-white/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-[#F0F0F5]">{board.title}</h2>
                      <p className="mt-1 text-sm text-[#9CA3AF] line-clamp-2">{board.description || 'No description yet.'}</p>
                    </div>
                    <span className="text-[#D4AF37]"><FiArrowRight className="h-4 w-4" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37]"><FiTrendingUp className="h-4 w-4" /> Threads</div>
            <div className="space-y-2">
              {visibleThreads.map((thread) => {
                const board = boardById.get(thread.board_id);
                if (!board) return null;
                return (
                  <Link key={thread.id} href={`/b/${board.slug || slugify(board.title)}/t/${slugify(thread.title)}`} className="block rounded-[12px] border border-white/10 bg-[#121212] p-4 hover:border-white/20">
                    <div className="text-lg font-semibold text-[#F0F0F5]">{thread.title}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-[#9CA3AF]">{thread.body}</p>
                    <div className="mt-2 flex gap-4 text-xs text-[#7A7A7A]">
                      <span><FiBookmark className="mr-1 inline h-3.5 w-3.5" />{thread.save_count}</span>
                      <span><FiEye className="mr-1 inline h-3.5 w-3.5" />{thread.view_count}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4AF37]"><FiArrowRight className="h-4 w-4" /> Cards</div>
            <div className="grid gap-3 md:grid-cols-2">
              {visibleCards.map((card) => {
                const thread = card.thread_id ? threads.find((item) => item.id === card.thread_id) : null;
                const board = thread ? boardById.get(thread.board_id) : null;
                const href = card.external_link || (thread && board ? `/b/${board.slug || slugify(board.title)}/t/${slugify(thread.title)}` : '/search');

                return (
                  <a key={card.id} onClick={() => void incrementCardClick(card.id)} href={href} target={card.external_link ? '_blank' : undefined} rel={card.external_link ? 'noreferrer' : undefined} className="block rounded-[12px] border border-white/10 bg-[#121212] p-4 hover:border-white/20">
                    <div className="text-base font-semibold text-[#F0F0F5]">{card.name}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-[#9CA3AF]">{card.description || 'External recommendation'}</p>
                    <div className="mt-2 flex gap-3 text-xs text-[#7A7A7A]">
                      <span>{card.category}</span>
                      <span><FiBookmark className="mr-1 inline h-3.5 w-3.5" />{card.save_count}</span>
                      <span><FiEye className="mr-1 inline h-3.5 w-3.5" />{card.click_count}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[14px] border border-white/10 bg-[#121212] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Top contributors</div>
            <div className="mt-3 space-y-2">
              {topContributors.map(({ user, totalSaves }, index) => (
                <Link key={user.id} href={`/profile/${encodeURIComponent(user.username || user.name || user.id)}`} className="flex items-center justify-between rounded-[10px] border border-white/10 bg-[#171717] px-3 py-2 hover:border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#222222] text-sm font-semibold text-[#F0F0F5]">{(user.name || user.username || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="text-sm font-semibold text-[#F0F0F5]">{user.name || user.username}</div>
                      <div className="text-xs text-[#8D8D8D]">@{user.username || 'user'}</div>
                    </div>
                  </div>
                  <div className="text-xs text-[#D4AF37]">#{index + 1} · {totalSaves}</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[14px] border border-white/10 bg-[#121212] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Keep moving</div>
            <div className="mt-3 space-y-2">
              <Link href="/boards" className="flex items-center justify-between rounded-[10px] border border-white/10 bg-[#171717] px-3 py-3 text-sm text-[#F0F0F5]">
                <span>Create or manage boards</span>
                <FiArrowRight className="h-4 w-4 text-[#D4AF37]" />
              </Link>
              <Link href="/search" className="flex items-center justify-between rounded-[10px] border border-white/10 bg-[#171717] px-3 py-3 text-sm text-[#F0F0F5]">
                <span>Search all content</span>
                <FiArrowRight className="h-4 w-4 text-[#D4AF37]" />
              </Link>
              <Link href="/me" className="flex items-center justify-between rounded-[10px] border border-white/10 bg-[#171717] px-3 py-3 text-sm text-[#F0F0F5]">
                <span>Your dashboard</span>
                <FiUser className="h-4 w-4 text-[#D4AF37]" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Panel({ text }: { text: string }) {
  return <div className="rounded-[12px] border border-white/10 bg-[#121212] p-4 text-sm text-[#9CA3AF]">{text}</div>;
}
