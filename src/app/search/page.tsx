"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiSearch } from 'react-icons/fi';
import { incrementCardClick } from '@/lib/engagement';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';

type BoardRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  created_at: string;
  user_id: string;
};

type ThreadRow = {
  id: string;
  board_id: string;
  title: string;
  body: string;
  created_at: string;
};

type CardRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number | null;
  external_link: string | null;
  file_url: string | null;
  thread_id: string | null;
  created_at: string;
  creator_id?: string;
};

type SearchItem = {
  id: string;
  type: 'board' | 'thread' | 'card';
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
  cardId?: string;
};

const filters = ['all', 'boards', 'threads', 'cards'] as const;
type Filter = (typeof filters)[number];

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SearchItem[]>([]);

  useEffect(() => {
    async function loadIndex() {
      setLoading(true);
      try {
        const [boardsRes, threadsRes, cardsRes] = await Promise.all([
          supabase.from('boards').select('id, title, description, slug, created_at, user_id').order('created_at', { ascending: false }).limit(120),
          supabase.from('threads').select('id, board_id, title, body, created_at').order('created_at', { ascending: false }).limit(240),
          supabase.from('product_cards').select('id, name, description, category, price, external_link, file_url, thread_id, created_at, creator_id').order('created_at', { ascending: false }).limit(300),
        ]);

        const boards = (boardsRes.data || []) as BoardRow[];
        const threads = (threadsRes.data || []) as ThreadRow[];
        const cards = (cardsRes.data || []) as CardRow[];

        const boardById = new Map<string, BoardRow>(boards.map((board) => [board.id, board]));

        const boardItems: SearchItem[] = boards.map((board) => ({
          id: `board-${board.id}`,
          type: 'board',
          title: board.title,
          subtitle: board.description || 'Board',
          href: `/b/${board.slug || slugify(board.title)}`,
          createdAt: board.created_at,
        }));

        const threadItems: SearchItem[] = threads.map((thread) => {
          const board = boardById.get(thread.board_id);
          const boardSlug = board ? board.slug || slugify(board.title) : null;
          return {
            id: `thread-${thread.id}`,
            type: 'thread',
            title: thread.title,
            subtitle: thread.body || 'Thread',
            href: boardSlug ? `/b/${boardSlug}/t/${slugify(thread.title)}` : '/boards',
            createdAt: thread.created_at,
          };
        });

        const seenCardKeys = new Set<string>();
        const cardItems: SearchItem[] = cards.reduce<SearchItem[]>((accumulator, card) => {
          const fallbackThread = card.thread_id ? threads.find((candidate) => candidate.id === card.thread_id) : null;
          const fallbackBoard = fallbackThread ? boardById.get(fallbackThread.board_id) : null;
          const href = card.external_link || card.file_url || (fallbackThread && fallbackBoard ? `/b/${fallbackBoard.slug || slugify(fallbackBoard.title)}/t/${slugify(fallbackThread.title)}` : '/keys');
          const dedupeKey = `${card.creator_id || 'unknown'}|${card.external_link || card.file_url || ''}|${card.name.toLowerCase()}`;

          if (seenCardKeys.has(dedupeKey)) {
            return accumulator;
          }

          seenCardKeys.add(dedupeKey);

          const priceLabel = (card.category === 'product' || card.category === 'service') && card.price !== null ? ` · $${card.price}` : '';
          accumulator.push({
            id: `card-${card.id}`,
            type: 'card',
            title: card.name,
            subtitle: `${card.category}${priceLabel}${card.description ? ` · ${card.description}` : ''}`,
            href,
            createdAt: card.created_at,
            cardId: card.id,
          });

          return accumulator;
        }, []);

        setItems([...boardItems, ...threadItems, ...cardItems]);
      } finally {
        setLoading(false);
      }
    }

    loadIndex();
  }, []);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items
      .filter((item) => {
        const typeMatch = filter === 'all' || item.type === (filter === 'cards' ? 'card' : filter.slice(0, -1));
        const queryMatch = !normalized || `${item.title} ${item.subtitle}`.toLowerCase().includes(normalized);
        return typeMatch && queryMatch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, query, filter]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[14px] border border-white/10 bg-[#121212] p-4">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0B0B0B] px-4 py-3">
          <FiSearch className="h-5 w-5 text-[#9CA3AF]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search boards, threads, products, services, links"
            className="w-full bg-transparent text-sm text-[#F0F0F5] outline-none placeholder:text-[#6B7280]"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.14em] ${filter === item ? 'bg-[#F5F5F5] text-black' : 'border border-white/10 bg-[#1A1A1A] text-[#CFCFCF]'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {loading ? <div className="rounded-[14px] border border-white/10 bg-[#121212] p-4 text-sm text-[#9CA3AF]">Loading search index...</div> : null}

        {!loading && visibleItems.length === 0 ? (
          <div className="rounded-[14px] border border-white/10 bg-[#121212] p-4 text-sm text-[#9CA3AF]">
            No matches yet. Try another keyword or add more boards/threads/cards.
          </div>
        ) : null}

        {visibleItems.map((item) => (
          <Link
            key={item.id}
            onClick={() => {
              if (item.type === 'card' && item.cardId) {
                void incrementCardClick(item.cardId);
              }
            }}
            href={item.href}
            target={item.href.startsWith('http') ? '_blank' : undefined}
            className="block rounded-[12px] border border-white/10 bg-[#121212] p-4 hover:border-white/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#8D8D8D]">{item.type}</div>
                <h2 className="mt-1 text-lg font-semibold text-[#F0F0F5]">{item.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-[#A3A3A3]">{item.subtitle}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm text-[#D4AF37]">
                Open <FiArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
