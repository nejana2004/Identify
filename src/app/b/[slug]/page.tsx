"use client";

import Link from 'next/link';
import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { FiArrowRight, FiBookmark, FiCheck, FiGlobe, FiLock, FiMessageCircle, FiPlus, FiSearch, FiShield, FiStar, FiUsers } from 'react-icons/fi';

type BoardRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  board_type: string;
  access_price: number | null;
  invite_code: string | null;
  topic_tags: string[] | null;
  created_at: string;
  cover_image: string | null;
  user_id: string;
  slug: string | null;
};

type OwnerRow = {
  username: string | null;
  name: string | null;
  profile_photo: string | null;
};

type ThreadRow = {
  id: string;
  title: string;
  body: string;
  thread_type: string;
  is_pinned: boolean;
  is_solved: boolean;
  save_count: number;
  click_count: number;
  view_count: number;
  reply_count?: number;
  created_at: string;
  author_id: string;
};

type ReplyRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  parent_reply_id: string | null;
  reply_level: number;
};

type ProductCardRow = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string;
  image_url: string | null;
  file_url: string | null;
  external_link: string | null;
  verified_owner: boolean;
  save_count: number;
  click_count: number;
  purchase_count: number;
  usage_count: number;
  created_at: string;
  thread_id: string | null;
  creator_id: string;
};

type BoardMember = {
  id: string;
  name: string | null;
  username: string | null;
  profile_photo: string | null;
};

type InventoryCard = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string;
  image_url: string | null;
  file_url: string | null;
  external_link: string | null;
  verified_owner: boolean;
};

export default function BoardVaultPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [user, setUser] = useState<any>(null);
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [owner, setOwner] = useState<OwnerRow | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [threadCards, setThreadCards] = useState<Record<string, ProductCardRow[]>>({});
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [inventoryCards, setInventoryCards] = useState<InventoryCard[]>([]);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerType, setComposerType] = useState<'question' | 'answer' | 'review' | 'recommendation'>('question');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    async function loadBoard() {
      setLoading(true);
      setError(null);

      try {
        const [{ data: authData }, { data: boardRows }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('boards').select('id, title, description, is_public, board_type, access_price, invite_code, topic_tags, created_at, cover_image, user_id, slug'),
        ]);

        setUser(authData.user);

        const resolvedBoard = (boardRows || []).find((candidate: BoardRow) => {
          const candidateSlug = candidate.slug || slugify(candidate.title);
          return candidateSlug === slug;
        }) as BoardRow | undefined;

        if (!resolvedBoard) {
          setError('Board not found.');
          setBoard(null);
          setThreads([]);
          return;
        }

        setBoard(resolvedBoard);

        const [ownerResult, threadResult, memberResult] = await Promise.all([
          supabase.from('users').select('username, name, profile_photo').eq('id', resolvedBoard.user_id).maybeSingle(),
          supabase.from('threads').select('id, title, body, thread_type, is_pinned, is_solved, save_count, click_count, view_count, created_at, author_id').eq('board_id', resolvedBoard.id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('board_followers').select('user_id').eq('board_id', resolvedBoard.id).limit(8),
        ]);

        setOwner(ownerResult.data || null);

        const formattedThreads = (threadResult.data || []) as ThreadRow[];
        setThreads(formattedThreads);

        const threadIds = formattedThreads.map((item) => item.id);
        if (threadIds.length > 0) {
          const { data: replyRows } = await supabase
            .from('thread_replies')
            .select('thread_id')
            .in('thread_id', threadIds);

          const { data: cardRows } = await supabase
            .from('product_cards')
            .select('id, name, description, price, category, image_url, file_url, external_link, verified_owner, save_count, click_count, purchase_count, usage_count, created_at, thread_id, creator_id')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: true });

          const replyCountMap = (replyRows || []).reduce<Record<string, number>>((accumulator, reply) => {
            accumulator[reply.thread_id] = (accumulator[reply.thread_id] || 0) + 1;
            return accumulator;
          }, {});

          setReplyCounts(replyCountMap);

          const groupedCards = (cardRows || []).reduce<Record<string, ProductCardRow[]>>((accumulator, card) => {
            const threadId = card.thread_id as string;
            if (!accumulator[threadId]) {
              accumulator[threadId] = [];
            }
            accumulator[threadId].push(card as ProductCardRow);
            return accumulator;
          }, {});

          setThreadCards(groupedCards);
        } else {
          setThreadCards({});
        }

        if (authData.user) {
          const [inventoryResult, profileResult] = await Promise.all([
            supabase
              .from('product_cards')
              .select('id, name, description, price, category, image_url, file_url, external_link, verified_owner')
              .eq('creator_id', authData.user.id)
              .is('thread_id', null)
              .order('created_at', { ascending: false }),
            supabase.from('users').select('id, name, username, profile_photo').in('id', (memberResult.data || []).map((item) => item.user_id)),
          ]);

          setInventoryCards((inventoryResult.data || []) as InventoryCard[]);
          setMembers((profileResult.data || []) as BoardMember[]);
        } else {
          setInventoryCards([]);
          setMembers([]);
        }
      } catch (boardError: any) {
        setError(boardError?.message || 'Failed to load board.');
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, [slug]);

  const boardSlug = board ? (board.slug || slugify(board.title)) : slug;
  const boardTitle = board?.title || 'Board';
  const ownerName = owner?.name || owner?.username || 'Unknown creator';
  const stats = useMemo(() => {
    const totalCards = threads.reduce((sum, thread) => sum + (threadCards[thread.id]?.length || 0), 0);

    return [
      { value: `${members.length || 0}`, label: 'members', icon: <FiUsers className="h-4 w-4" /> },
      { value: `${threads.length || 0}`, label: 'threads', icon: <FiMessageCircle className="h-4 w-4" /> },
      { value: `${totalCards}`, label: 'cards', icon: <FiBookmark className="h-4 w-4" /> },
    ];
  }, [members.length, threadCards, threads]);

  async function createThread() {
    if (!board || !user || posting) return;

    if (!composerTitle.trim() || !composerBody.trim()) {
      setError('Add a title and body before posting.');
      return;
    }

    setPosting(true);
    setError(null);

    try {
      const { data: threadData, error: threadError } = await supabase
        .from('threads')
        .insert({
          board_id: board.id,
          author_id: user.id,
          title: composerTitle.trim(),
          body: composerBody.trim(),
          thread_type: composerType,
          is_indexed: true,
        })
        .select('id, title, body, thread_type, is_pinned, is_solved, save_count, click_count, view_count, created_at, author_id')
        .single();

      if (threadError || !threadData) {
        throw threadError || new Error('Unable to create thread.');
      }

      const selectedCards = inventoryCards.filter((card) => selectedCardIds.includes(card.id));
      if (selectedCards.length > 0) {
        const duplicateCards = selectedCards.map((card) => ({
          creator_id: user.id,
          thread_id: threadData.id,
          name: card.name,
          description: card.description,
          price: card.price,
          category: card.category,
          image_url: card.image_url,
          file_url: card.file_url,
          external_link: card.external_link,
          verified_owner: card.verified_owner,
        }));

        const { error: cardError } = await supabase.from('product_cards').insert(duplicateCards);
        if (cardError) {
          throw cardError;
        }
      }

      setComposerTitle('');
      setComposerBody('');
      setComposerType('question');
      setSelectedCardIds([]);
      setShowInventory(false);

      const nextThread = threadData as ThreadRow;
      setThreads((current) => [nextThread, ...current]);
      if (selectedCardIds.length > 0) {
        const attachedCards = inventoryCards.filter((card) => selectedCardIds.includes(card.id)).map((card) => ({
          id: `draft-${card.id}`,
          name: card.name,
          description: card.description,
          price: card.price,
          category: card.category,
          image_url: card.image_url,
          file_url: card.file_url,
          external_link: card.external_link,
          verified_owner: card.verified_owner,
          save_count: 0,
          click_count: 0,
          purchase_count: 0,
          usage_count: 0,
          created_at: new Date().toISOString(),
          thread_id: nextThread.id,
          creator_id: user.id,
        })) as ProductCardRow[];

        setThreadCards((current) => ({
          ...current,
          [nextThread.id]: attachedCards,
        }));
      }
    } catch (postError: any) {
      setError(postError?.message || 'Failed to publish thread.');
    } finally {
      setPosting(false);
    }
  }

  const title = boardTitle;
  const stateLabel = board?.board_type === 'paid' ? 'Paid board' : board?.board_type === 'invite-only' ? 'Invite-only board' : 'Open board';
  const stateIcon = board?.board_type === 'paid' || board?.board_type === 'invite-only' ? <FiLock className="h-4 w-4" /> : <FiGlobe className="h-4 w-4" />;
  const canPost = !!user && (board?.is_public || board?.user_id === user?.id);

  if (loading) {
    return <Shell><LoadingPanel /></Shell>;
  }

  if (error && !board) {
    return <Shell><EmptyState title="Board unavailable" text={error} /></Shell>;
  }

  if (!board) {
    return <Shell><EmptyState title="Board unavailable" text="This board could not be found." /></Shell>;
  }

  return (
    <Shell>
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#12121A] shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="min-h-[180px] bg-[linear-gradient(135deg,rgba(212,175,55,0.22),rgba(18,18,26,0.94)),radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_25%)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#D4AF37]">
            {stateIcon}
            {stateLabel}
          </div>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-black/30 text-2xl font-semibold text-[#D4AF37]">
                  {title[0]}
                </div>
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight text-[#F0F0F5] sm:text-5xl">{title}</h1>
                  <p className="mt-2 text-sm text-[#9CA3AF]">@{ownerName} · {board.topic_tags?.[0] || 'Knowledge board'} · Verified</p>
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-[#C7CAD1]">
                {board.description || 'A searchable board for questions, answers, reviews, and recommendations that stay useful over time.'}
              </p>

              <div className="flex flex-wrap gap-2 text-sm text-[#9CA3AF]">
                {stats.map((stat) => (
                  <span key={stat.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0F] px-3 py-1.5">
                    {stat.icon}
                    {stat.value} {stat.label}
                  </span>
                ))}
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0F] px-3 py-1.5">
                  <FiShield className="h-4 w-4" />
                  Top contributor badge enabled
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {board.board_type === 'paid' ? (
                <Link href={`/checkout?product=board-access&title=${encodeURIComponent(title)}&price=${encodeURIComponent(String(board.access_price || 9))}`} className="inline-flex items-center justify-center rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0A0A0F]">
                  Subscribe ${board.access_price || 9}/month
                </Link>
              ) : board.board_type === 'invite-only' ? (
                <button className="inline-flex items-center justify-center rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0A0A0F]">
                  Request access
                </button>
              ) : (
                <button className="inline-flex items-center justify-center rounded-full bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0A0A0F]">
                  Join board
                </button>
              )}
              <button className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#F0F0F5]">
                Share
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#0A0A0F] p-6">
          {!canPost && (
            <div className="mb-6 rounded-[28px] border border-white/10 bg-[#1A1A24] p-5 text-sm leading-7 text-[#9CA3AF]">
              Posting is limited here until you join this board. The rest of the board remains searchable and readable.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {threads.length > 0 ? threads.map((thread) => (
                <article key={thread.id} className={`rounded-[28px] border border-white/10 bg-[#12121A] p-5 ${thread.is_pinned ? 'border-l-4 border-l-[#D4AF37]' : ''}`}>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">
                    <FiMessageCircle className="h-4 w-4 text-[#D4AF37]" />
                    {thread.thread_type}
                    {thread.is_pinned && <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-0.5 text-[#D4AF37]">Pinned</span>}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-[#F0F0F5]">{thread.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[#9CA3AF]">{thread.body}</p>
                  {threadCards[thread.id]?.length ? (
                    <div className="mt-4 grid gap-3">
                      {threadCards[thread.id].slice(0, 3).map((card) => (
                        <div key={card.id} className="rounded-2xl border border-white/10 bg-[#0A0A0F] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-base font-semibold text-[#F0F0F5]">{card.name}</div>
                              <div className="mt-1 text-sm leading-6 text-[#9CA3AF]">{card.description || 'Recommendation card attached to this thread.'}</div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#9CA3AF]">
                                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{card.category}</span>
                                <span className="rounded-full border border-[#10B981]/20 bg-[#10B981]/10 px-3 py-1 text-[#10B981]">{card.verified_owner ? 'Verified owner' : 'External'}</span>
                              </div>
                            </div>
                            <Link href={card.external_link || `/checkout?title=${encodeURIComponent(card.name)}&price=${encodeURIComponent(String(card.price || 0))}`} className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-sm font-semibold text-[#D4AF37]">
                              Open
                              <FiArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#9CA3AF]">
                    <Badge text={`${replyCounts[thread.id] || 0} replies`} />
                    <Badge text={`${thread.save_count} saves`} />
                    <Badge text={`${thread.view_count} views`} />
                    <Badge text={`${thread.click_count} clicks`} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/b/${boardSlug}/t/${slugify(thread.title)}`} className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-sm font-semibold text-[#D4AF37]">
                      Open thread
                      <FiArrowRight className="h-4 w-4" />
                    </Link>
                    <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]">
                      <FiBookmark className="h-4 w-4 text-[#D4AF37]" /> Save
                    </button>
                  </div>
                </article>
              )) : (
                <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-sm text-[#9CA3AF]">
                  No threads yet. Start the board with the first question or recommendation.
                </div>
              )}

              <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Composer</div>
                    <div className="mt-2 text-xl font-semibold text-[#F0F0F5]">Start a thread</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-[#0A0A0F] px-3 py-1 text-xs text-[#9CA3AF]">Type / to attach a card</div>
                </div>

                <div className="mt-4 grid gap-3">
                  <input
                    value={composerTitle}
                    onChange={(event) => setComposerTitle(event.target.value)}
                    placeholder="Thread title"
                    className="h-12 rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 text-sm text-[#F0F0F5] outline-none placeholder:text-[#6B7280]"
                    disabled={!canPost}
                  />
                  <textarea
                    value={composerBody}
                    onChange={(event) => {
                      setComposerBody(event.target.value);
                      if (event.target.value.includes('/')) {
                        setShowInventory(true);
                      }
                    }}
                    placeholder="Write a question, answer, review, or recommendation..."
                    className="min-h-[150px] rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-sm leading-7 text-[#F0F0F5] outline-none placeholder:text-[#6B7280]"
                    disabled={!canPost}
                  />

                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">
                    {(['question', 'answer', 'review', 'recommendation'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setComposerType(type)}
                        className={`rounded-full px-3 py-1.5 ${composerType === type ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-black/20 text-[#F0F0F5]'}`}
                        disabled={!canPost}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => setShowInventory((current) => !current)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]"
                      disabled={!canPost || inventoryCards.length === 0}
                    >
                      <FiPlus className="h-4 w-4 text-[#D4AF37]" />
                      {selectedCardIds.length > 0 ? `${selectedCardIds.length} cards attached` : 'Attach from inventory'}
                    </button>

                    <button
                      onClick={createThread}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-50"
                      disabled={!canPost || posting}
                    >
                      {posting ? 'Publishing...' : 'Send it'}
                      <FiArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {showInventory && inventoryCards.length > 0 && (
                    <div className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">Inventory</div>
                        <button className="text-xs text-[#9CA3AF]" onClick={() => setShowInventory(false)}>Hide</button>
                      </div>
                      <div className="mt-3 grid gap-2 max-h-[260px] overflow-y-auto pr-1">
                        {inventoryCards.map((card) => {
                          const checked = selectedCardIds.includes(card.id);
                          return (
                            <button
                              key={card.id}
                              onClick={() => {
                                setSelectedCardIds((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id]);
                              }}
                              className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left ${checked ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10' : 'border-white/10 bg-[#12121A]'}`}
                            >
                              <div>
                                <div className="text-sm font-semibold text-[#F0F0F5]">{card.name}</div>
                                <div className="text-xs text-[#9CA3AF]">{card.category} · {card.price ? `$${card.price}` : 'Free'}</div>
                              </div>
                              {checked ? <FiCheck className="h-4 w-4 text-[#D4AF37]" /> : <FiPlus className="h-4 w-4 text-[#9CA3AF]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">About This Vault</div>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                    {title[0]}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-[#F0F0F5]">{title}</div>
                    <div className="text-sm text-[#9CA3AF]">by {ownerName}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-[#9CA3AF]">
                  {(board.topic_tags || ['Searchable', 'Structured posts', 'Trust signals']).slice(0, 4).map((tag) => (
                    <div key={tag} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">{tag}</div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#9CA3AF]">
                  {board.board_type === 'paid' ? <Badge text={`$${board.access_price || 9} / month`} /> : null}
                  {board.board_type === 'invite-only' ? <Badge text="Invite-only access" /> : <Badge text="Public access" />}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Members</div>
                <div className="mt-4 flex -space-x-2">
                  {members.slice(0, 6).map((member) => (
                    <div key={member.id} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#12121A] bg-[#D4AF37]/15 text-sm font-semibold text-[#D4AF37]">
                      {(member.name || member.username || 'U').charAt(0)}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-[#9CA3AF]">{members.length || 0} visible insiders</div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Cards in this board</div>
                <div className="mt-4 grid gap-3">
                  {threads.flatMap((thread) => threadCards[thread.id] || []).slice(0, 3).map((card) => (
                    <div key={card.id} className="rounded-2xl border border-white/10 bg-[#0A0A0F] p-4">
                      <div className="text-sm font-semibold text-[#F0F0F5]">{card.name}</div>
                      <div className="mt-1 text-sm text-[#9CA3AF]">{card.description || 'Attached recommendation'}</div>
                      <div className="mt-2 text-xs text-[#9CA3AF]">{card.verified_owner ? 'Verified owner' : 'External'} · {card.price ? `$${card.price}` : 'Free'}</div>
                    </div>
                  ))}
                  {threads.every((thread) => !(threadCards[thread.id] || []).length) && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#9CA3AF]">
                      Attach your first product, place, or service card to make this board feel alive.
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>;
}

function LoadingPanel() {
  return <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-[#9CA3AF]">Loading board...</div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6">
      <div className="text-2xl font-semibold text-[#F0F0F5]">{title}</div>
      <p className="mt-2 text-sm leading-7 text-[#9CA3AF]">{text}</p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return <span className="rounded-full border border-white/10 bg-[#0A0A0F] px-3 py-1 text-xs text-[#F0F0F5]">{text}</span>;
}