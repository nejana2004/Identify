"use client";

import Link from 'next/link';
import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { FiArrowLeft, FiArrowRight, FiBookmark, FiCheck, FiEye, FiHeart, FiMessageCircle, FiPlus, FiShare2, FiStar } from 'react-icons/fi';

type BoardRow = {
  id: string;
  title: string;
  description: string | null;
  board_type: string;
  access_price: number | null;
  is_public: boolean;
  user_id: string;
  slug: string | null;
};

type ThreadRow = {
  id: string;
  board_id: string;
  author_id: string;
  title: string;
  body: string;
  thread_type: string;
  is_pinned: boolean;
  is_solved: boolean;
  save_count: number;
  click_count: number;
  view_count: number;
  created_at: string;
};

type ReplyRow = {
  id: string;
  author_id: string;
  parent_reply_id: string | null;
  body: string;
  reply_level: number;
  save_count: number;
  click_count: number;
  created_at: string;
};

type ProductCardRow = {
  id: string;
  creator_id: string;
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
  thread_id: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  name: string | null;
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

type ThreadWithAuthor = ThreadRow & {
  author: ProfileRow | null;
};

type ReplyWithAuthor = ReplyRow & {
  author: ProfileRow | null;
};

export default function ThreadDetailPage({ params }: { params: Promise<{ slug: string; threadSlug: string }> }) {
  const { slug, threadSlug } = use(params);

  const [user, setUser] = useState<any>(null);
  const [board, setBoard] = useState<BoardRow | null>(null);
  const [thread, setThread] = useState<ThreadWithAuthor | null>(null);
  const [replies, setReplies] = useState<ReplyWithAuthor[]>([]);
  const [cards, setCards] = useState<ProductCardRow[]>([]);
  const [inventoryCards, setInventoryCards] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    async function loadThread() {
      setLoading(true);
      setError(null);

      try {
        const [{ data: authData }, { data: boardRows }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from('boards').select('id, title, description, board_type, access_price, is_public, user_id, slug'),
        ]);

        setUser(authData.user);

        const resolvedBoard = (boardRows || []).find((candidate: BoardRow) => (candidate.slug || slugify(candidate.title)) === slug) as BoardRow | undefined;
        if (!resolvedBoard) {
          setError('Board not found.');
          return;
        }

        setBoard(resolvedBoard);

        const { data: threadRows } = await supabase
          .from('threads')
          .select('id, board_id, author_id, title, body, thread_type, is_pinned, is_solved, save_count, click_count, view_count, created_at')
          .eq('board_id', resolvedBoard.id)
          .order('created_at', { ascending: false });

        const resolvedThread = (threadRows || []).find((candidate: ThreadRow) => slugify(candidate.title) === threadSlug) as ThreadRow | undefined;
        if (!resolvedThread) {
          setError('Thread not found.');
          return;
        }

        const [threadAuthorResult, replyRowsResult, cardRowsResult] = await Promise.all([
          supabase.from('users').select('id, username, name, profile_photo').eq('id', resolvedThread.author_id).maybeSingle(),
          supabase.from('thread_replies').select('id, author_id, parent_reply_id, body, reply_level, save_count, click_count, created_at').eq('thread_id', resolvedThread.id).order('created_at', { ascending: true }),
          supabase.from('product_cards').select('id, creator_id, name, description, price, category, image_url, file_url, external_link, verified_owner, save_count, click_count, purchase_count, usage_count, thread_id').eq('thread_id', resolvedThread.id).order('created_at', { ascending: true }),
        ]);

        const replyAuthorIds = Array.from(new Set((replyRowsResult.data || []).map((reply) => reply.author_id)));
        const cardCreatorIds = Array.from(new Set((cardRowsResult.data || []).map((card) => card.creator_id)));
        const [replyAuthorsResult, cardCreatorsResult] = await Promise.all([
          replyAuthorIds.length > 0 ? supabase.from('users').select('id, username, name, profile_photo').in('id', replyAuthorIds) : Promise.resolve({ data: [] as ProfileRow[] }),
          cardCreatorIds.length > 0 ? supabase.from('users').select('id, username, name, profile_photo').in('id', cardCreatorIds) : Promise.resolve({ data: [] as ProfileRow[] }),
        ]);

        const replyAuthorsById = new Map((replyAuthorsResult.data || []).map((profile) => [profile.id, profile]));
        const cardCreatorsById = new Map((cardCreatorsResult.data || []).map((profile) => [profile.id, profile]));

        setThread({ ...resolvedThread, author: threadAuthorResult.data || null });
        setReplies((replyRowsResult.data || []).map((reply) => ({ ...reply, author: replyAuthorsById.get(reply.author_id) || null })));
        setCards((cardRowsResult.data || []).map((card) => ({ ...card, creator: cardCreatorsById.get(card.creator_id) || null })) as ProductCardRow[]);

        if (authData.user) {
          const { data: inventoryData } = await supabase
            .from('product_cards')
            .select('id, name, description, price, category, image_url, file_url, external_link, verified_owner')
            .eq('creator_id', authData.user.id)
            .is('thread_id', null)
            .order('created_at', { ascending: false });

          setInventoryCards((inventoryData || []) as InventoryCard[]);
        } else {
          setInventoryCards([]);
        }
      } catch (threadError: any) {
        setError(threadError?.message || 'Failed to load thread.');
      } finally {
        setLoading(false);
      }
    }

    loadThread();
  }, [slug, threadSlug]);

  const boardSlug = board ? (board.slug || slugify(board.title)) : slug;
  const canReply = !!user && (board?.is_public || board?.user_id === user?.id);
  const threadAuthor = thread?.author?.name || thread?.author?.username || 'Unknown author';
  const topReplies = useMemo(() => replies.filter((reply) => reply.reply_level === 0), [replies]);
  const nestedReplies = useMemo(() => {
    return replies.reduce<Map<string, ReplyWithAuthor[]>>((groups, reply) => {
      if (reply.reply_level > 0 && reply.parent_reply_id) {
        const existing = groups.get(reply.parent_reply_id) || [];
        groups.set(reply.parent_reply_id, [...existing, reply]);
      }
      return groups;
    }, new Map());
  }, [replies]);

  async function submitReply() {
    if (!thread || !user || posting) return;
    if (!replyBody.trim()) {
      setError('Write a reply first.');
      return;
    }

    setPosting(true);
    setError(null);

    try {
      const { data: replyData, error: replyError } = await supabase
        .from('thread_replies')
        .insert({
          thread_id: thread.id,
          author_id: user.id,
          parent_reply_id: null,
          body: replyBody.trim(),
          reply_level: 0,
        })
        .select('id, author_id, parent_reply_id, body, reply_level, save_count, click_count, created_at')
        .single();

      if (replyError || !replyData) {
        throw replyError || new Error('Unable to create reply.');
      }

      const selectedCards = inventoryCards.filter((card) => selectedCardIds.includes(card.id));
      if (selectedCards.length > 0) {
        const duplicateCards = selectedCards.map((card) => ({
          creator_id: user.id,
          thread_id: thread.id,
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

        const { data: freshCards } = await supabase
          .from('product_cards')
          .select('id, creator_id, name, description, price, category, image_url, file_url, external_link, verified_owner, save_count, click_count, purchase_count, usage_count, thread_id')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: true });

        setCards((freshCards || []) as ProductCardRow[]);
      }

      const replyAuthor = {
        id: user.id,
        username: user.user_metadata?.username || user.email || null,
        name: user.user_metadata?.name || user.email || null,
        profile_photo: null,
      };

      setReplies((current) => [...current, { ...replyData, author: replyAuthor } as ReplyWithAuthor]);
      setReplyBody('');
      setSelectedCardIds([]);
      setShowInventory(false);
    } catch (replyError: any) {
      setError(replyError?.message || 'Failed to post reply.');
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return <Shell><LoadingPanel /></Shell>;
  }

  if (error && !thread) {
    return <Shell><EmptyState title="Thread unavailable" text={error} /></Shell>;
  }

  if (!board || !thread) {
    return <Shell><EmptyState title="Thread unavailable" text="The selected thread could not be found." /></Shell>;
  }

  const boardState = board.board_type === 'paid' ? 'Paid board' : board.board_type === 'invite-only' ? 'Invite-only board' : 'Open board';

  return (
    <Shell>
      <Link href={`/b/${boardSlug}`} className="inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#F0C94A]">
        <FiArrowLeft className="h-4 w-4" /> Back to {board.title}
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <article className="rounded-[28px] border-l-4 border-l-[#3B82F6] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">
              <span className="rounded-full bg-[#3B82F6]/10 px-3 py-1 text-[#3B82F6]">{thread.thread_type}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{thread.is_solved ? 'Solved' : 'Open'}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{boardState}</span>
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
                  <Avatar initial={(threadAuthor || 'U')[0]} />
                  <div>
                    <div className="font-semibold text-[#F0F0F5]">{threadAuthor}</div>
                    <div>{new Date(thread.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#F0F0F5]">{thread.title}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-[#C7CAD1]">{thread.body}</p>
              </div>
              <div className="hidden rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold text-[#D4AF37] sm:inline-flex">Verified ask</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#9CA3AF]">
              <Pill icon={<FiMessageCircle className="h-4 w-4" />} text={`${replies.length} replies`} />
              <Pill icon={<FiHeart className="h-4 w-4" />} text={`${thread.save_count} saves`} />
              <Pill icon={<FiBookmark className="h-4 w-4" />} text={`${cards.length} cards`} />
              <Pill icon={<FiEye className="h-4 w-4" />} text={`${thread.view_count} views`} />
            </div>
          </article>

          <article className="rounded-[28px] border-l-4 border-l-[#D4AF37] border border-white/10 bg-[#1A1A24] p-6">
            <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
              <Avatar initial={(threadAuthor || 'A')[0]} golden />
              <div>
                <div className="font-semibold text-[#F0F0F5]">{threadAuthor} · Creator · Top contributor</div>
                <div>{new Date(thread.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#C7CAD1]">
              This answer stays searchable and lets people attach cards directly inside the conversation. Useful posts should read like a second opinion, not a performance.
            </p>

            {cards.length > 0 && (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {cards.map((card) => (
                  <ProductCard key={card.id} card={card} />
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#9CA3AF]">
              <Pill icon={<FiMessageCircle className="h-4 w-4" />} text={`${replies.length} replies`} />
              <Pill icon={<FiHeart className="h-4 w-4" />} text={`${thread.save_count} saves`} />
              <Pill icon={<FiShare2 className="h-4 w-4" />} text="Share" />
            </div>
          </article>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-[#F0F0F5]">Replies</h2>
            {topReplies.length > 0 ? topReplies.map((reply) => (
              <article key={reply.id} className="rounded-[24px] border border-white/10 bg-[#12121A] p-5">
                <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
                  <Avatar initial={(reply.author?.name || reply.author?.username || 'R')[0]} />
                  <div>
                    <div className="font-semibold text-[#F0F0F5]">{reply.author?.username || reply.author?.name || 'Unknown'}</div>
                    <div>{new Date(reply.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#C7CAD1]">{reply.body}</p>
                {nestedReplies.get(reply.id)?.length ? (
                  <div className="mt-4 ml-10 border-l-2 border-[#2A2A3A] pl-4 text-sm leading-7 text-[#9CA3AF]">
                    {nestedReplies.get(reply.id)?.map((nestedReply) => (
                      <div key={nestedReply.id} className="mb-3 last:mb-0">
                        <strong className="text-[#F0F0F5]">@{nestedReply.author?.username || nestedReply.author?.name || 'reply'}:</strong> {nestedReply.body}
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            )) : (
              <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-5 text-sm text-[#9CA3AF]">No replies yet. Be the first to respond.</div>
            )}
          </section>

          <section className="sticky bottom-4 rounded-[28px] border border-white/10 bg-[#0A0A0F]/95 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur">
            <div className="rounded-2xl border border-white/10 bg-[#12121A] p-4 text-sm text-[#9CA3AF]">
              Type / to attach a card from your inventory.
            </div>
            <div className="mt-3 grid gap-3">
              <textarea
                value={replyBody}
                onChange={(event) => {
                  setReplyBody(event.target.value);
                  if (event.target.value.includes('/')) {
                    setShowInventory(true);
                  }
                }}
                disabled={!canReply}
                placeholder={canReply ? 'Drop a reply...' : 'Join this board to reply.'}
                className="min-h-[110px] rounded-2xl border border-white/10 bg-[#12121A] px-4 py-3 text-sm leading-7 text-[#F0F0F5] outline-none placeholder:text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-60"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setShowInventory((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-[#F0F0F5] disabled:opacity-60"
                  disabled={!canReply || inventoryCards.length === 0}
                >
                  <FiPlus className="h-4 w-4 text-[#D4AF37]" />
                  {selectedCardIds.length > 0 ? `${selectedCardIds.length} cards attached` : 'Attach card'}
                </button>

                <button
                  onClick={submitReply}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60"
                  disabled={!canReply || posting}
                >
                  {posting ? 'Sending...' : 'Send reply'}
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
                          onClick={() => setSelectedCardIds((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id])}
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
          </section>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.07em] text-[#9CA3AF]">Thread Stats</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatBox value={`${thread.view_count}`} label="Views" />
              <StatBox value={`${thread.save_count}`} label="Saves" />
            </div>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-3 text-sm font-semibold text-[#D4AF37]">
              <FiBookmark className="h-4 w-4" /> Save thread
            </button>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.07em] text-[#9CA3AF]">Products in this thread</div>
            <div className="mt-4 grid gap-3">
              {cards.length > 0 ? cards.map((card) => (
                <div key={card.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A0A0F] p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">{card.category.slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#F0F0F5]">{card.name}</div>
                    <div className="truncate text-xs text-[#9CA3AF]">{card.verified_owner ? 'Verified owner' : 'External'} · {card.price ? `$${card.price}` : 'Free'}</div>
                  </div>
                  <div className="font-mono text-sm text-[#D4AF37]">{card.price ? `$${card.price}` : '$0'}</div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#9CA3AF]">No cards attached yet.</div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.07em] text-[#9CA3AF]">Related threads</div>
            <div className="mt-4 grid gap-3">
              {[...cards].slice(0, 2).map((card) => (
                <div key={card.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm text-[#F0F0F5]">{card.name}</div>
                  <div className="mt-1 text-xs text-[#9CA3AF]">Attached recommendation in this discussion</div>
                </div>
              ))}
              {cards.length === 0 && <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#9CA3AF]">No related cards yet.</div>}
            </div>
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
  return <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-[#9CA3AF]">Loading thread...</div>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6">
      <div className="text-2xl font-semibold text-[#F0F0F5]">{title}</div>
      <p className="mt-2 text-sm leading-7 text-[#9CA3AF]">{text}</p>
    </div>
  );
}

function Avatar({ initial, golden = false }: { initial: string; golden?: boolean }) {
  return <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${golden ? 'border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-white/10 bg-black/20 text-[#F0F0F5]'}`}>{initial}</div>;
}

function Pill({ icon, text }: { icon: ReactNode; text: string }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{icon}{text}</span>;
}

function ProductCard({ card }: { card: ProductCardRow }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[#F0F0F5]">{card.name}</div>
          <div className="text-sm text-[#9CA3AF]">{card.description || 'Product card attached to the thread.'}</div>
        </div>
        <div className="rounded-full bg-[#10B981]/15 px-3 py-1 text-xs font-semibold text-[#10B981]">{card.verified_owner ? 'Verified owner' : 'External'}</div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-[#9CA3AF]">
        <span className="text-[#D4AF37]">{card.price ? `$${card.price}` : '$0'}</span>
        <Link href={card.external_link || `/checkout?title=${encodeURIComponent(card.name)}&price=${encodeURIComponent(String(card.price || 0))}`} className="inline-flex items-center gap-1 text-[#D4AF37]">
          Claim <FiArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A0A0F] p-4 text-center">
      <div className="text-2xl font-semibold text-[#F0F0F5]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">{label}</div>
    </div>
  );
}