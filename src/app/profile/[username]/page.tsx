"use client";

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { incrementCardClick } from '@/lib/engagement';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { FiArrowRight, FiBookmark, FiEye, FiLayers, FiLink2, FiMessageSquare } from 'react-icons/fi';

type ProfileRow = {
  id: string;
  username: string | null;
  name: string | null;
  bio: string | null;
  country: string | null;
  profile_photo: string | null;
};

type BoardRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  created_at: string;
};

type ThreadRow = {
  id: string;
  board_id: string;
  title: string;
  body: string;
  view_count: number;
  save_count: number;
  created_at: string;
};

type CardRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  external_link: string | null;
  save_count: number;
  click_count: number;
  thread_id: string | null;
  created_at: string;
};

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const resolvedParams = use(params);
  const username = decodeURIComponent(resolvedParams.username);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [boards, setBoards] = useState<BoardRow[]>([]);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        let profileData: ProfileRow | null = null;

        const primary = await supabase.from('users').select('id, username, name, bio, country, profile_photo').eq('username', username).maybeSingle();
        profileData = primary.data as ProfileRow | null;

        if (!profileData) {
          const fallback = await supabase.from('users').select('id, username, name, bio, country, profile_photo').eq('name', username).maybeSingle();
          profileData = fallback.data as ProfileRow | null;
        }

        if (!profileData) {
          setError('Profile not found.');
          return;
        }

        setProfile(profileData);

        const [boardsRes, threadsRes, cardsRes] = await Promise.all([
          supabase.from('boards').select('id, title, description, slug, created_at').eq('user_id', profileData.id).eq('is_public', true).order('created_at', { ascending: false }).limit(12),
          supabase.from('threads').select('id, board_id, title, body, view_count, save_count, created_at').eq('author_id', profileData.id).order('created_at', { ascending: false }).limit(12),
          supabase.from('product_cards').select('id, name, description, category, external_link, save_count, click_count, thread_id, created_at').eq('creator_id', profileData.id).order('created_at', { ascending: false }).limit(20),
        ]);

        setBoards((boardsRes.data || []) as BoardRow[]);
        setThreads((threadsRes.data || []) as ThreadRow[]);

        const seen = new Set<string>();
        const uniqueCards = ((cardsRes.data || []) as CardRow[]).filter((card) => {
          const key = `${card.external_link || ''}|${card.name.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setCards(uniqueCards);
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [username]);

  const boardByThread = useMemo(() => new Map(boards.map((board) => [board.id, board])), [boards]);

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-[#9CA3AF]">Loading profile...</div>;
  }

  if (error || !profile) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-red-300">{error || 'Profile unavailable.'}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-[16px] border border-white/10 bg-[#121212] p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-[#1A1A1A]">
            {profile.profile_photo ? (
              <Image src={profile.profile_photo} alt={profile.name || profile.username || 'profile'} fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[#F0F0F5]">{(profile.name || profile.username || 'U').charAt(0).toUpperCase()}</div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-semibold text-[#F0F0F5]">{profile.name || profile.username}</h1>
            <div className="mt-1 text-sm text-[#8D8D8D]">@{profile.username || 'user'}</div>
            {profile.bio ? <p className="mt-3 max-w-3xl text-sm leading-7 text-[#BDBDBD]">{profile.bio}</p> : null}
            {profile.country ? <div className="mt-2 text-xs uppercase tracking-[0.16em] text-[#6B7280]">{profile.country}</div> : null}
          </div>

          <Link href="/search" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#171717] px-4 py-2 text-sm text-[#F0F0F5]">
            Search network <FiArrowRight className="h-4 w-4 text-[#D4AF37]" />
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Section title="Boards" icon={<FiLayers className="h-4 w-4" />}>
            {boards.length === 0 ? <Empty text="No public boards yet." /> : boards.map((board) => (
              <Link key={board.id} href={`/b/${board.slug || slugify(board.title)}`} className="block rounded-[12px] border border-white/10 bg-[#121212] p-4 hover:border-white/20">
                <div className="text-lg font-semibold text-[#F0F0F5]">{board.title}</div>
                <div className="mt-1 text-sm text-[#8D8D8D]">{board.description || 'No description yet.'}</div>
              </Link>
            ))}
          </Section>

          <Section title="Threads" icon={<FiMessageSquare className="h-4 w-4" />}>
            {threads.length === 0 ? <Empty text="No threads yet." /> : threads.map((thread) => {
              const board = boardByThread.get(thread.board_id);
              return (
                <Link key={thread.id} href={board ? `/b/${board.slug || slugify(board.title)}/t/${slugify(thread.title)}` : '/boards'} className="block rounded-[12px] border border-white/10 bg-[#121212] p-4 hover:border-white/20">
                  <div className="text-lg font-semibold text-[#F0F0F5]">{thread.title}</div>
                  <div className="mt-1 line-clamp-2 text-sm text-[#8D8D8D]">{thread.body}</div>
                  <div className="mt-2 flex gap-4 text-xs text-[#6B7280]">
                    <span><FiEye className="mr-1 inline h-3.5 w-3.5" />{thread.view_count}</span>
                    <span><FiBookmark className="mr-1 inline h-3.5 w-3.5" />{thread.save_count}</span>
                  </div>
                </Link>
              );
            })}
          </Section>
        </div>

        <aside className="space-y-5">
          <Section title="Recommendations" icon={<FiLink2 className="h-4 w-4" />} compact>
            {cards.length === 0 ? <Empty text="No recommendations yet." /> : cards.map((card) => (
              <a key={card.id} onClick={() => void incrementCardClick(card.id)} href={card.external_link || '#'} target="_blank" rel="noreferrer" className="block rounded-[12px] border border-white/10 bg-[#121212] p-4 hover:border-white/20">
                <div className="text-base font-semibold text-[#F0F0F5]">{card.name}</div>
                <div className="mt-1 text-sm text-[#8D8D8D]">{card.description || 'External recommendation'}</div>
                <div className="mt-2 flex gap-3 text-xs text-[#6B7280]">
                  <span>{card.category}</span>
                  <span>{card.click_count} clicks</span>
                  <span>{card.save_count} saves</span>
                </div>
              </a>
            ))}
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, icon, children, compact = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={`rounded-[16px] border border-white/10 bg-[#0E0E0E] ${compact ? 'p-4' : 'p-5'}`}>
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#D4AF37]">{icon}{title}</div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-[12px] border border-white/10 bg-[#121212] p-4 text-sm text-[#9CA3AF]">{text}</div>;
}
