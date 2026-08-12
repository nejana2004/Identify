"use client";

import Link from 'next/link';
import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSavesForUser, getVotesForUser, incrementCardClick, setVoteForTarget, toggleSaveForTarget } from '@/lib/engagement';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { FiArrowLeft, FiArrowRight, FiBookmark, FiCheck, FiChevronDown, FiChevronUp, FiEdit2, FiEye, FiHeart, FiMessageCircle, FiPlus, FiShare2, FiTrash2, FiX } from 'react-icons/fi';
import SimpleModal from '@/components/SimpleModal';

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
  upvote_count: number;
  downvote_count: number;
  vote_score: number;
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
  upvote_count: number;
  downvote_count: number;
  vote_score: number;
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
  const router = useRouter();

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
  const [externalCardLink, setExternalCardLink] = useState('');
  const [posting, setPosting] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [threadVote, setThreadVote] = useState(0);
  const [replyVotes, setReplyVotes] = useState<Record<string, number>>({});
  const [threadSaved, setThreadSaved] = useState(false);
  const [savedCards, setSavedCards] = useState<Record<string, boolean>>({});
  const [editingThread, setEditingThread] = useState<ThreadRow | null>(null);
  const [threadDraftTitle, setThreadDraftTitle] = useState('');
  const [threadDraftBody, setThreadDraftBody] = useState('');
  const [threadDraftType, setThreadDraftType] = useState<'question' | 'answer' | 'review' | 'recommendation'>('question');
  const [editingCard, setEditingCard] = useState<ProductCardRow | null>(null);
  const [cardDraftName, setCardDraftName] = useState('');
  const [cardDraftDescription, setCardDraftDescription] = useState('');
  const [cardDraftExternalLink, setCardDraftExternalLink] = useState('');
  const [cardDraftPrice, setCardDraftPrice] = useState('');
  const [cardDraftCategory, setCardDraftCategory] = useState('product');

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

        const resolvedThread = ((threadRows || []) as any[])
          .map((candidate) => ({ ...candidate, upvote_count: candidate.upvote_count || 0, downvote_count: candidate.downvote_count || 0, vote_score: candidate.vote_score || 0 }))
          .find((candidate: ThreadRow) => slugify(candidate.title) === threadSlug) as ThreadRow | undefined;
        if (!resolvedThread) {
          setError('Thread not found.');
          return;
        }

        await supabase
          .from('threads')
          .update({ view_count: (resolvedThread.view_count || 0) + 1 })
          .eq('id', resolvedThread.id);

        resolvedThread.view_count = (resolvedThread.view_count || 0) + 1;

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
        setReplies((replyRowsResult.data || []).map((reply: any) => ({ ...reply, upvote_count: reply.upvote_count || 0, downvote_count: reply.downvote_count || 0, vote_score: reply.vote_score || 0, author: replyAuthorsById.get(reply.author_id) || null })));
        setCards((cardRowsResult.data || []).map((card) => ({ ...card, creator: cardCreatorsById.get(card.creator_id) || null })) as ProductCardRow[]);

        if (authData.user) {
          const { data: inventoryData } = await supabase
            .from('product_cards')
            .select('id, name, description, price, category, image_url, file_url, external_link, verified_owner')
            .eq('creator_id', authData.user.id)
            .is('thread_id', null)
            .order('created_at', { ascending: false });

          const [threadVoteRows, replyVoteRows, threadSaveRows, cardSaveRows] = await Promise.all([
            getVotesForUser(authData.user.id, 'thread', [resolvedThread.id]),
            getVotesForUser(authData.user.id, 'reply', (replyRowsResult.data || []).map((reply) => reply.id)),
            getSavesForUser(authData.user.id, 'thread', [resolvedThread.id]),
            getSavesForUser(authData.user.id, 'card', (cardRowsResult.data || []).map((card) => card.id)),
          ]);

          setInventoryCards((inventoryData || []) as InventoryCard[]);
          setThreadVote(threadVoteRows[0]?.vote_value || 0);
          setReplyVotes(Object.fromEntries(replyVoteRows.map((item) => [item.target_id, item.vote_value])));
          setThreadSaved(threadSaveRows.some((item) => item.target_id === resolvedThread.id));
          setSavedCards(Object.fromEntries(cardSaveRows.map((item) => [item.target_id, true])));
        } else {
          setInventoryCards([]);
          setThreadVote(0);
          setReplyVotes({});
          setThreadSaved(false);
          setSavedCards({});
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

  const supportsPrice = (category: string) => category === 'product' || category === 'service';

  const cardTarget = (card: ProductCardRow) => {
    if (card.external_link) return card.external_link;
    if (card.file_url) return card.file_url;
    return `/keys`;
  };

  async function submitReply(mode: 'reply' | 'attachment' = 'reply') {
    if (!thread || !user || posting) return;

    const hasReplyText = !!replyBody.trim();
    const hasAttachment = selectedCardIds.length > 0 || !!externalCardLink.trim();

    if (!hasReplyText && !hasAttachment) {
      setError('Write a reply or attach at least one card/link.');
      return;
    }

    if (mode === 'reply' && !hasReplyText) {
      setError('Reply text is required for Send reply. Use Attach only for attachment-only posts.');
      return;
    }

    if (mode === 'attachment' && !hasAttachment) {
      setError('Attach a card or external link first.');
      return;
    }

    setPosting(true);
    setError(null);

    try {
      let replyData: ReplyRow | null = null;
      if (hasReplyText) {
        const { data: createdReply, error: replyError } = await supabase
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

        if (replyError || !createdReply) {
          throw replyError || new Error('Unable to create reply.');
        }

        replyData = createdReply as ReplyRow;
      }

      const selectedCards = inventoryCards.filter((card) => selectedCardIds.includes(card.id));
      const newThreadCards: any[] = [];

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

        newThreadCards.push(...duplicateCards);

        const { error: cardError } = await supabase.from('product_cards').insert(duplicateCards);
        if (cardError) {
          throw cardError;
        }
      }

      if (externalCardLink.trim()) {
        const linkCard = {
          creator_id: user.id,
          thread_id: thread.id,
          name: 'External link',
          description: 'Attached from reply composer',
          price: null,
          category: 'service',
          image_url: null,
          file_url: null,
          external_link: externalCardLink.trim(),
          verified_owner: false,
        };

        newThreadCards.push(linkCard);

        const { error: cardError } = await supabase.from('product_cards').insert(linkCard);
        if (cardError) {
          throw cardError;
        }
      }

      if (newThreadCards.length > 0) {
        const { data: freshCards } = await supabase
          .from('product_cards')
          .select('id, creator_id, name, description, price, category, image_url, file_url, external_link, verified_owner, save_count, click_count, purchase_count, usage_count, thread_id')
          .eq('thread_id', thread.id)
          .order('created_at', { ascending: true });

        setCards((freshCards || []) as ProductCardRow[]);
      }

      if (replyData) {
        const replyAuthor = {
          id: user.id,
          username: user.user_metadata?.username || user.email || null,
          name: user.user_metadata?.name || user.email || null,
          profile_photo: null,
        };

        setReplies((current) => [...current, { ...replyData, author: replyAuthor } as ReplyWithAuthor]);
      }

      if (user.id !== thread.author_id) {
        const actor = user.user_metadata?.name || user.user_metadata?.username || user.email || 'Someone';
        await supabase.from('notifications').insert({
          user_id: thread.author_id,
          type: newThreadCards.length > 0 ? 'card_attached' : 'reply_created',
          title: newThreadCards.length > 0 ? 'New reply with attachment' : 'New reply in your thread',
          message: `${actor} replied to "${thread.title}"`,
          from_user_id: user.id,
          board_id: board?.id || null,
          thread_id: thread.id,
        });
      }

      setReplyBody('');
      setSelectedCardIds([]);
      setExternalCardLink('');
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

  function openThreadEditor(item: ThreadRow) {
    if (!user || item.author_id !== user.id) return;
    setEditingThread(item);
    setThreadDraftTitle(item.title);
    setThreadDraftBody(item.body);
    setThreadDraftType((item.thread_type as 'question' | 'answer' | 'review' | 'recommendation') || 'question');
  }

  async function updateThread() {
    if (!editingThread || !user || editingThread.author_id !== user.id) return;

    const nextTitle = threadDraftTitle.trim();
    const nextBody = threadDraftBody.trim();
    if (!nextTitle || !nextBody) {
      setError('Thread title and body are required.');
      return;
    }

    const { data, error: updateError } = await supabase
      .from('threads')
      .update({
        title: nextTitle,
        body: nextBody,
        thread_type: threadDraftType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingThread.id)
      .eq('author_id', user.id)
      .select('id, board_id, author_id, title, body, thread_type, is_pinned, is_solved, save_count, click_count, view_count, created_at')
      .single();

    if (updateError || !data) {
      setError(updateError?.message || 'Failed to update thread.');
      return;
    }

    setThread((current) => current ? { ...current, title: data.title, body: data.body, thread_type: data.thread_type } : current);
    setEditingThread(null);
    router.push(`/b/${boardSlug}/t/${slugify(nextTitle)}`);
  }

  async function removeThread() {
    if (!thread || !user || thread.author_id !== user.id) return;
    if (!window.confirm('Delete this thread and all attached replies/cards?')) return;

    const { error: deleteError } = await supabase
      .from('threads')
      .delete()
      .eq('id', thread.id)
      .eq('author_id', user.id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete thread.');
      return;
    }

    router.push(`/b/${boardSlug}`);
  }

  function openCardEditor(card: ProductCardRow) {
    if (!user || card.creator_id !== user.id) return;
    setEditingCard(card);
    setCardDraftName(card.name);
    setCardDraftDescription(card.description || '');
    setCardDraftExternalLink(card.external_link || '');
    setCardDraftPrice(card.price !== null && card.price !== undefined ? String(card.price) : '');
    setCardDraftCategory(card.category || 'product');
  }

  async function editCard() {
    if (!editingCard || !user || editingCard.creator_id !== user.id) return;

    const nextName = cardDraftName.trim();
    if (!nextName) {
      setError('Card name is required.');
      return;
    }

    const acceptsPrice = cardDraftCategory === 'product' || cardDraftCategory === 'service';
    const nextPriceRaw = cardDraftPrice.trim();
    const nextPrice = acceptsPrice && nextPriceRaw ? Number(nextPriceRaw) : null;

    if (acceptsPrice && nextPriceRaw && Number.isNaN(nextPrice)) {
      setError('Price must be a valid number.');
      return;
    }

    const { data, error: updateError } = await supabase
      .from('product_cards')
      .update({
        name: nextName,
        description: cardDraftDescription.trim() || null,
        category: cardDraftCategory,
        external_link: cardDraftExternalLink.trim() || null,
        price: nextPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingCard.id)
      .eq('creator_id', user.id)
      .select('id, creator_id, name, description, price, category, image_url, file_url, external_link, verified_owner, save_count, click_count, purchase_count, usage_count, thread_id')
      .single();

    if (updateError || !data) {
      setError(updateError?.message || 'Failed to edit card.');
      return;
    }

    setCards((current) => current.map((item) => item.id === editingCard.id ? (data as ProductCardRow) : item));
    setEditingCard(null);
  }

  async function removeCard(card: ProductCardRow) {
    if (!user || card.creator_id !== user.id) return;
    if (!window.confirm('Delete this attached card?')) return;

    const { error: deleteError } = await supabase
      .from('product_cards')
      .delete()
      .eq('id', card.id)
      .eq('creator_id', user.id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete card.');
      return;
    }

    setCards((current) => current.filter((item) => item.id !== card.id));
  }

  async function removeReply(reply: ReplyWithAuthor) {
    if (!user || reply.author_id !== user.id) return;
    if (!window.confirm('Delete this reply?')) return;

    const { error: deleteError } = await supabase
      .from('thread_replies')
      .delete()
      .eq('id', reply.id)
      .eq('author_id', user.id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete reply.');
      return;
    }

    setReplies((current) => current.filter((item) => item.id !== reply.id && item.parent_reply_id !== reply.id));
  }

  async function shareThread() {
    const url = `${window.location.origin}/b/${boardSlug}/t/${threadSlug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: thread?.title || 'Thread', url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 1800);
    } catch {}
  }

  async function handleThreadVote(value: 1 | -1) {
    if (!thread || !user) {
      router.push('/auth/login');
      return;
    }

    try {
      const result = await setVoteForTarget(user.id, 'thread', thread.id, value);
      setThreadVote(result.activeVote);
      setThread((current) => current ? { ...current, upvote_count: result.upvoteCount, downvote_count: result.downvoteCount, vote_score: result.voteScore } : current);
    } catch (voteError: any) {
      setError(voteError?.message || 'Unable to vote on thread.');
    }
  }

  async function handleReplyVote(replyId: string, value: 1 | -1) {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const result = await setVoteForTarget(user.id, 'reply', replyId, value);
      setReplyVotes((current) => ({ ...current, [replyId]: result.activeVote }));
      setReplies((current) => current.map((reply) => reply.id === replyId ? { ...reply, upvote_count: result.upvoteCount, downvote_count: result.downvoteCount, vote_score: result.voteScore } : reply));
    } catch (voteError: any) {
      setError(voteError?.message || 'Unable to vote on reply.');
    }
  }

  async function handleThreadSave() {
    if (!thread || !user) {
      router.push('/auth/login');
      return;
    }

    try {
      const result = await toggleSaveForTarget(user.id, 'thread', thread.id);
      setThreadSaved(result.saved);
      setThread((current) => current ? { ...current, save_count: result.saveCount } : current);
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to save thread.');
    }
  }

  async function handleCardOpen(card: ProductCardRow) {
    await incrementCardClick(card.id);
    setCards((current) => current.map((item) => item.id === card.id ? { ...item, click_count: (item.click_count || 0) + 1 } : item));
  }

  async function handleCardSave(cardId: string) {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const result = await toggleSaveForTarget(user.id, 'card', cardId);
      setSavedCards((current) => ({ ...current, [cardId]: result.saved }));
      setCards((current) => current.map((item) => item.id === cardId ? { ...item, save_count: result.saveCount } : item));
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to save card.');
    }
  }

  const boardState = board.board_type === 'paid' ? 'Paid board' : board.board_type === 'invite-only' ? 'Invite-only board' : 'Open board';

  const threadEditModal = (
    <SimpleModal open={!!editingThread} title="Edit thread" description="Update the thread title, topic, and body." onClose={() => setEditingThread(null)} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Thread type</label>
          <div className="flex flex-wrap gap-2">
            {(['question', 'answer', 'review', 'recommendation'] as const).map((type) => (
              <button key={type} type="button" onClick={() => setThreadDraftType(type)} className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.14em] ${threadDraftType === type ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-[#161616] text-[#F0F0F5]'}`}>
                {type}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Title</label>
          <input value={threadDraftTitle} onChange={(event) => setThreadDraftTitle(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none" placeholder="Thread title" />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Body</label>
          <textarea value={threadDraftBody} onChange={(event) => setThreadDraftBody(event.target.value)} className="min-h-[140px] w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-3 text-sm text-[#F5F5F5] outline-none" placeholder="Add details here" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setEditingThread(null)} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#F0F0F5]">Cancel</button>
          <button type="button" onClick={updateThread} className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">Save thread</button>
        </div>
      </div>
    </SimpleModal>
  );

  const cardEditModal = (
    <SimpleModal open={!!editingCard} title="Edit card" description="Update the recommendation card content and links." onClose={() => setEditingCard(null)} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Category</label>
          <select value={cardDraftCategory} onChange={(event) => setCardDraftCategory(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none">
            <option value="product">Product</option>
            <option value="service">Service</option>
            <option value="place">Place</option>
            <option value="tool">Tool</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Name</label>
          <input value={cardDraftName} onChange={(event) => setCardDraftName(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none" placeholder="Card name" />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Description</label>
          <textarea value={cardDraftDescription} onChange={(event) => setCardDraftDescription(event.target.value)} className="min-h-[110px] w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-3 text-sm text-[#F5F5F5] outline-none" placeholder="Short description" />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">External link</label>
          <input value={cardDraftExternalLink} onChange={(event) => setCardDraftExternalLink(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none" placeholder="https://..." />
        </div>
        {(cardDraftCategory === 'product' || cardDraftCategory === 'service') && (
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Price</label>
            <input value={cardDraftPrice} onChange={(event) => setCardDraftPrice(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none" placeholder="9.99" />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setEditingCard(null)} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#F0F0F5]">Cancel</button>
          <button type="button" onClick={editCard} className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">Save card</button>
        </div>
      </div>
    </SimpleModal>
  );

  return (
    <>
      {threadEditModal}
      {cardEditModal}

      <Shell>
        <Link href={`/b/${boardSlug}`} className="inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#F0C94A]">
          <FiArrowLeft className="h-4 w-4" /> Back to {board.title}
        </Link>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-5">
            <article className="rounded-[14px] border border-white/10 bg-[#121212] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
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
                <Pill icon={<FiChevronUp className="h-4 w-4" />} text={`${thread.vote_score || 0} score`} />
                <Pill icon={<FiBookmark className="h-4 w-4" />} text={`${cards.length} cards`} />
                <Pill icon={<FiEye className="h-4 w-4" />} text={`${thread.view_count} views`} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => handleThreadVote(1)} title="Upvote" className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${threadVote === 1 ? 'border-[#D4AF37]/40 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/20 bg-white/[0.03] text-[#F0F0F5]'}`}><FiChevronUp className="h-4 w-4" /></button>
                <button onClick={() => handleThreadVote(-1)} title="Downvote" className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${threadVote === -1 ? 'border-red-400/40 bg-red-500/10 text-red-300' : 'border-white/20 bg-white/[0.03] text-[#F0F0F5]'}`}><FiChevronDown className="h-4 w-4" /></button>
                <button onClick={handleThreadSave} title="Save thread" className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${threadSaved ? 'border-[#D4AF37]/35 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/20 bg-white/[0.03] text-[#F0F0F5]'}`}><FiBookmark className="h-4 w-4" /></button>
                <button onClick={shareThread} title="Share thread" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.03] text-[#F0F0F5]">
                  {shareState === 'copied' ? <FiCheck className="h-4 w-4 text-[#10B981]" /> : <FiShare2 className="h-4 w-4" />}
                </button>
                {user?.id === thread.author_id && (
                  <>
                    <button onClick={() => openThreadEditor(thread)} title="Edit thread" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.03] text-[#F0F0F5]"><FiEdit2 className="h-4 w-4" /></button>
                    <button onClick={removeThread} title="Delete thread" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-300"><FiTrash2 className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            </article>

            <article className="rounded-[14px] border-l-4 border-l-[#D4AF37] border border-white/10 bg-[#171717] p-4">
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
                <button onClick={shareThread} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-[#9CA3AF]">
                  {shareState === 'copied' ? <FiCheck className="h-4 w-4 text-[#10B981]" /> : <FiShare2 className="h-4 w-4" />} {shareState === 'copied' ? 'Copied' : 'Share'}
                </button>
              </div>
            </article>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-[#F0F0F5]">Replies</h2>
              {topReplies.length > 0 ? topReplies.map((reply) => (
                <article key={reply.id} className="rounded-[12px] border border-white/10 bg-[#121212] p-4">
                  <div className="flex items-center gap-3 text-sm text-[#9CA3AF]">
                    <Avatar initial={(reply.author?.name || reply.author?.username || 'R')[0]} />
                    <div>
                      <div className="font-semibold text-[#F0F0F5]">{reply.author?.username || reply.author?.name || 'Unknown'}</div>
                      <div>{new Date(reply.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#C7CAD1]">{reply.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => handleReplyVote(reply.id, 1)} title="Upvote reply" className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${replyVotes[reply.id] === 1 ? 'border-[#D4AF37]/40 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}><FiChevronUp className="h-4 w-4" /></button>
                    <button onClick={() => handleReplyVote(reply.id, -1)} title="Downvote reply" className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${replyVotes[reply.id] === -1 ? 'border-red-400/40 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}><FiChevronDown className="h-4 w-4" /></button>
                    <span className="text-xs text-[#8D8D8D]">{reply.vote_score || 0}</span>
                    {user?.id === reply.author_id && (
                      <div>
                        <button onClick={() => removeReply(reply)} className="inline-flex items-center gap-1 rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs text-red-300">
                          <FiTrash2 className="h-3.5 w-3.5" /> Delete reply
                        </button>
                      </div>
                    )}
                  </div>
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
                <div className="rounded-[12px] border border-white/10 bg-[#121212] p-4 text-sm text-[#9CA3AF]">No replies yet. Be the first to respond.</div>
              )}
            </section>

            <section className="rounded-[12px] border border-white/10 bg-[#0B0B0B] p-4">
              <div className="mt-3 grid gap-3">
                <textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  disabled={!canReply}
                  placeholder={canReply ? 'Drop a reply...' : 'Join this board to reply.'}
                  className="min-h-[110px] rounded-2xl border border-white/10 bg-[#12121A] px-4 py-3 text-sm leading-7 text-[#F0F0F5] outline-none placeholder:text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setShowInventory((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-[#F0F0F5] disabled:opacity-60"
                    disabled={!canReply}
                  >
                    <FiPlus className="h-4 w-4 text-[#D4AF37]" />
                    {selectedCardIds.length > 0 ? `${selectedCardIds.length} cards attached` : 'Attach card'}
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => submitReply('attachment')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-[#1B1B1B] px-4 py-3 text-sm font-semibold text-[#F0F0F5] disabled:opacity-60"
                      disabled={!canReply || posting || (selectedCardIds.length === 0 && !externalCardLink.trim())}
                    >
                      {posting ? 'Sending...' : 'Attach only'}
                    </button>

                    <button
                      onClick={() => submitReply('reply')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60"
                      disabled={!canReply || posting}
                    >
                      {posting ? 'Sending...' : 'Send reply'}
                      <FiArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <div className="rounded-[12px] border border-white/10 bg-[#121212] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.07em] text-[#9CA3AF]">Thread Stats</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatBox value={`${thread.view_count}`} label="Views" />
                <StatBox value={`${thread.save_count}`} label="Saves" />
              </div>
            </div>

            <div className="rounded-[12px] border border-white/10 bg-[#121212] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.07em] text-[#9CA3AF]">Products in this thread</div>
              <div className="mt-4 grid gap-3">
                {cards.length > 0 ? cards.map((card) => (
                  <div key={card.id} className="rounded-2xl border border-white/10 bg-[#0A0A0F] p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">{card.category.slice(0, 1).toUpperCase()}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[#F0F0F5]">{card.name}</div>
                        <div className="truncate text-xs text-[#9CA3AF]">{card.verified_owner ? 'Verified owner' : 'External'}{supportsPrice(card.category) && card.price !== null ? ` · $${card.price}` : ''}</div>
                      </div>
                      <div className="font-mono text-sm text-[#D4AF37]">{supportsPrice(card.category) && card.price !== null ? `$${card.price}` : card.category}</div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleCardSave(card.id)} className={`rounded-full border px-3 py-1 text-xs ${savedCards[card.id] ? 'border-[#D4AF37]/35 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/20 bg-white/[0.03] text-[#F0F0F5]'}`}>Save</button>
                        <Link onClick={() => void handleCardOpen(card)} href={cardTarget(card)} target={cardTarget(card).startsWith('http') ? '_blank' : undefined} className="text-xs text-[#D4AF37] hover:text-[#F0C94A]">Open card</Link>
                      </div>
                    </div>
                    {user?.id === card.creator_id && (
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => openCardEditor(card)} className="rounded-full border border-white/20 bg-white/[0.03] px-3 py-1 text-xs text-[#F0F0F5]">Edit</button>
                        <button onClick={() => removeCard(card)} className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs text-red-300">Delete</button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#9CA3AF]">No cards attached yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-[12px] border border-white/10 bg-[#121212] p-4">
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

        {showInventory && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
            <div className="w-full max-w-2xl rounded-[16px] border border-white/10 bg-[#0F0F0F] p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="text-sm font-semibold text-[#F5F5F5]">Attach from inventory</div>
                  <div className="text-xs text-[#8D8D8D]">Select saved cards and attach them to this thread.</div>
                </div>
                <button onClick={() => setShowInventory(false)} className="rounded-md border border-white/15 bg-[#1A1A1A] p-1.5 text-[#D0D0D0]"><FiX className="h-4 w-4" /></button>
              </div>

              <div className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                <div className="rounded-xl border border-white/10 bg-[#171717] p-3">
                  <label className="mb-2 block text-xs uppercase tracking-[0.16em] text-[#8D8D8D]">External link only</label>
                  <input
                    value={externalCardLink}
                    onChange={(event) => setExternalCardLink(event.target.value)}
                    placeholder="https://..."
                    className="h-11 w-full rounded-lg border border-white/10 bg-[#101010] px-3 text-sm text-[#F0F0F5] outline-none placeholder:text-[#6B7280]"
                  />
                </div>

                {inventoryCards.length > 0 ? inventoryCards.map((card) => {
                  const checked = selectedCardIds.includes(card.id);
                  return (
                    <button
                      key={card.id}
                      onClick={() => setSelectedCardIds((current) => current.includes(card.id) ? current.filter((id) => id !== card.id) : [...current, card.id])}
                      className={`w-full rounded-xl border p-3 text-left ${checked ? 'border-[#D4AF37]/35 bg-[#D4AF37]/10' : 'border-white/10 bg-[#171717]'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[#F5F5F5]">{card.name}</div>
                          <div className="mt-1 text-xs text-[#A3A3A3]">{card.description || 'No description'}</div>
                          <div className="mt-2 text-xs text-[#8D8D8D]">
                            {card.category}
                            {supportsPrice(card.category) && card.price !== null ? ` · $${card.price}` : ''}
                            {card.external_link ? ' · external link' : ''}
                          </div>
                        </div>
                        {checked ? <FiCheck className="mt-1 h-4 w-4 text-[#D4AF37]" /> : <FiPlus className="mt-1 h-4 w-4 text-[#8D8D8D]" />}
                      </div>
                    </button>
                  );
                }) : (
                  <div className="rounded-xl border border-white/10 bg-[#171717] p-4 text-sm text-[#A3A3A3]">
                    No inventory items yet. Create one in <Link href="/keys/inventory/new" className="text-[#D4AF37] hover:text-[#F0C94A]">inventory</Link>.
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <button onClick={() => setShowInventory(false)} className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm font-semibold text-black">Done</button>
              </div>
            </div>
          </div>
        )}
      </Shell>
    </>
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
  const supportsPrice = card.category === 'product' || card.category === 'service';
  const target = card.external_link || card.file_url || `/keys`;
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
        <span className="text-[#D4AF37]">{supportsPrice && card.price !== null ? `$${card.price}` : card.category}</span>
        <Link onClick={() => void incrementCardClick(card.id)} href={target} target={target.startsWith('http') ? '_blank' : undefined} className="inline-flex items-center gap-1 text-[#D4AF37]">
          Open <FiArrowRight className="h-4 w-4" />
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