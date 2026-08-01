"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { FiArrowRight, FiGlobe, FiHash, FiSearch, FiShield, FiStar, FiUsers } from 'react-icons/fi';

type Board = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  owner: string;
  followers: number;
  posts: number;
  topic: string;
};

type Person = {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  board_count: number;
  badge: string;
};

type CardItem = {
  id: string;
  title: string;
  type: 'product' | 'place' | 'service';
  why: string;
  link: string;
  saves: number;
  clicks: number;
};

const filters = ['All', 'Boards', 'People', 'Cards'];
const topics = ['Tech & tools', 'Design & creativity', 'Productivity & work', 'Local places & services', 'Lifestyle & consumer products'];

const starterCards: CardItem[] = [
  {
    id: '1',
    title: 'Your first unlock',
    type: 'product',
    why: 'A simple card you can attach to any board.',
    link: '#',
    saves: 0,
    clicks: 0,
  },
  {
    id: '2',
    title: 'Your first place card',
    type: 'place',
    why: 'A place recommendation with trust signals.',
    link: '#',
    saves: 0,
    clicks: 0,
  },
  {
    id: '3',
    title: 'Your first service card',
    type: 'service',
    why: 'A service card that explains the offer clearly.',
    link: '#',
    saves: 0,
    clicks: 0,
  },
];

export default function ExplorePage() {
  const [user, setUser] = useState<any>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [topic, setTopic] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        const [{ data: { user } }, { data: boardRows }, { data: personRows }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('boards').select('id, title, description, is_public, user_id').order('created_at', { ascending: false }).limit(24),
          supabase.from('users').select('id, username, name, bio, board_count').order('board_count', { ascending: false }).limit(24),
        ]);

        setUser(user);

        const formattedBoards = await Promise.all((boardRows || []).map(async (board) => {
          const [{ data: owner }, { count: followerCount }, { count: postCount }] = await Promise.all([
            supabase.from('users').select('username, name').eq('id', board.user_id).maybeSingle(),
            supabase.from('board_followers').select('*', { count: 'exact', head: true }).eq('board_id', board.id),
            supabase.from('pins').select('*', { count: 'exact', head: true }).eq('board_id', board.id),
          ]);

          const title = board.title.toLowerCase();
          const boardTopic = title.includes('kubernetes') || title.includes('tech') ? 'Tech & tools' : title.includes('colombo') || title.includes('cafe') ? 'Local places & services' : title.includes('design') ? 'Design & creativity' : 'Productivity & work';

          return {
            id: board.id,
            title: board.title,
            description: board.description,
            is_public: board.is_public,
            owner: owner?.name || owner?.username || 'Unknown',
            followers: followerCount || 0,
            posts: postCount || 0,
            topic: boardTopic,
          };
        }));

        setBoards(formattedBoards);

        const formattedPeople = (personRows || []).map((person, index) => ({
          id: person.id,
          username: person.username,
          name: person.name,
          bio: person.bio,
          board_count: person.board_count || 0,
          badge: index < 3 ? 'Top contributor' : 'Active in this topic',
        }));

        setPeople(formattedPeople);
      } catch (error) {
        console.error('Error loading discovery data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredBoards = useMemo(() => {
    return boards.filter((board) => {
      const matchesTopic = topic === 'All' || board.topic === topic;
      const haystack = `${board.title} ${board.description || ''} ${board.owner} ${board.topic}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      return matchesTopic && matchesQuery;
    });
  }, [boards, query, topic]);

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const haystack = `${person.username} ${person.name} ${person.bio || ''}`.toLowerCase();
      return !query || haystack.includes(query.toLowerCase());
    });
  }, [people, query]);

  const filteredCards = useMemo(() => {
    return starterCards.filter((card) => {
      const haystack = `${card.title} ${card.why} ${card.type}`.toLowerCase();
      const matchesQuery = !query || haystack.includes(query.toLowerCase());
      const matchesTopic = topic === 'All' || topic === 'Local places & services' || topic === 'Tech & tools' || topic === 'Design & creativity' || topic === 'Productivity & work';
      return matchesQuery && matchesTopic;
    });
  }, [query, topic]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              Search the network
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#F0F0F5] sm:text-4xl">
              Search by topic, board, person, or card type.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[#9CA3AF] sm:text-base">
              No feed. No ranking tricks. Just clear search, transparent trust signals, and boards that make knowledge easy to find.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-[#9CA3AF]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2">
              <FiShield className="h-4 w-4 text-[#D4AF37]" />
              Saves and clicks
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2">
              <FiUsers className="h-4 w-4 text-[#10B981]" />
              Followers and contributor badges
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 focus-within:border-[#D4AF37]/50">
            <FiSearch className="h-5 w-5 text-[#9CA3AF]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-[#F0F0F5] outline-none placeholder:text-[#4B5563]"
              placeholder="Search boards, threads, cards, and people"
            />
          </label>

          <div className="flex items-center gap-2">
            <Link href="/boards" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#F0F0F5] hover:bg-white/[0.06]">
              <FiHash className="h-4 w-4 text-[#D4AF37]" />
              Boards
            </Link>
            <Link href="/profile/me" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] hover:bg-[#F0C94A]">
              My profile
              <FiArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setActiveFilter(item)}
              className={`rounded-full px-4 py-2 text-sm transition ${activeFilter === item ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-white/[0.03] text-[#F0F0F5] hover:bg-white/[0.06]'}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
          <button onClick={() => setTopic('All')} className={`rounded-full px-4 py-2 text-sm ${topic === 'All' ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-black/20 text-[#F0F0F5]'}`}>All topics</button>
          {topics.map((item) => (
            <button key={item} onClick={() => setTopic(item)} className={`rounded-full px-4 py-2 text-sm ${topic === item ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-black/20 text-[#F0F0F5]'}`}>
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <SummaryCard title="Boards" value={filteredBoards.length.toString()} description="Public boards that people can browse, follow, and join." />
        <SummaryCard title="People" value={filteredPeople.length.toString()} description="Experts, reviewers, and people with useful knowledge." />
        <SummaryCard title="Cards" value={filteredCards.length.toString()} description="Structured product, place, and service recommendations." />
      </section>

      <Section title="Boards" subtitle="Search across topic boards and transparent access types.">
        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-[#9CA3AF]">Loading boards...</div>
        ) : filteredBoards.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredBoards.map((board) => (
              <Link key={board.id} href={`/b/${slugify(board.title)}`} className="group rounded-[28px] border border-white/10 bg-[#12121A] p-5 transition hover:-translate-y-1 hover:border-[#D4AF37]/30 hover:shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">
                  <span>{board.topic}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[#F0F0F5]">
                    {board.is_public ? <FiGlobe className="h-3.5 w-3.5 text-[#10B981]" /> : <FiShield className="h-3.5 w-3.5 text-[#D4AF37]" />}
                    {board.is_public ? 'Public' : 'Invite-only'}
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[#F0F0F5]">{board.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{board.description || 'A board for threaded questions, answers, and recommendations.'}</p>
                <div className="mt-5 flex items-center justify-between text-sm text-[#9CA3AF]">
                  <span>by {board.owner}</span>
                  <FiArrowRight className="h-4 w-4 text-[#D4AF37] transition group-hover:translate-x-1" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#9CA3AF]">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{board.followers} followers</span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{board.posts} posts</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="No boards matched your search." />
        )}
      </Section>

      <Section title="People" subtitle="Find board owners and contributors by name, handle, or bio.">
        {filteredPeople.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPeople.map((person) => (
              <Link key={person.id} href={`/profile/${person.username}`} className="rounded-[28px] border border-white/10 bg-[#12121A] p-5 transition hover:-translate-y-1 hover:border-[#D4AF37]/30 hover:shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-lg font-semibold text-[#D4AF37]">
                    {person.name?.[0] || person.username[0]}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[#F0F0F5]">{person.name}</div>
                    <div className="text-sm text-[#9CA3AF]">@{person.username}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#9CA3AF]">{person.bio || 'A board owner with useful contributions and a clear topic focus.'}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-[#F0F0F5]">{person.board_count} boards</span>
                  <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs text-[#D4AF37]">{person.badge}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="No people matched your search." />
        )}
      </Section>

      <Section title="Cards" subtitle="Structured recommendations with a short why note and a link.">
        {filteredCards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCards.map((card) => (
              <article key={card.id} className="rounded-[28px] border border-white/10 bg-[#12121A] p-5 transition hover:-translate-y-1 hover:border-[#D4AF37]/30 hover:shadow-[0_24px_90px_rgba(0,0,0,0.36)]">
                <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">
                  <span>{card.type}</span>
                  <span className="rounded-full border border-[#10B981]/20 bg-[#10B981]/10 px-3 py-1 text-[#10B981]">Trustworthy</span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-[#F0F0F5]">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{card.why}</p>
                <div className="mt-5 flex items-center justify-between text-sm text-[#9CA3AF]">
                  <span>{card.saves} saves · {card.clicks} clicks</span>
                  <a href={card.link} className="inline-flex items-center gap-1 text-[#D4AF37] hover:text-[#F0C94A]">
                    Open <FiArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState text="No cards matched your search." />
        )}
      </Section>
    </div>
  );
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">{title}</p>
      <div className="mt-3 text-4xl font-semibold text-[#F0F0F5]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{description}</p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">{title}</p>
        <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">{subtitle}</h2>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-sm text-[#9CA3AF]">
      {text}
    </div>
  );
}