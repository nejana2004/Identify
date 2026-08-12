"use client";

import Link from 'next/link';
import { use, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSavesForUser, getVotesForUser, incrementCardClick, setVoteForTarget, toggleSaveForTarget } from '@/lib/engagement';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { FiArrowRight, FiBookmark, FiCheck, FiChevronDown, FiChevronUp, FiEdit2, FiGlobe, FiLock, FiLogOut, FiMessageCircle, FiPlus, FiShare2, FiTrash2, FiUserPlus, FiUsers, FiX } from 'react-icons/fi';
import SimpleModal from '@/components/SimpleModal';

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
  upvote_count: number;
  downvote_count: number;
  vote_score: number;
  reply_count?: number;
  created_at: string;
  author_id: string;
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
  const router = useRouter();

  const [user, setUser] = useState<{ id: string } | null>(null);
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
  const [externalCardLink, setExternalCardLink] = useState('');
  const [posting, setPosting] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [joining, setJoining] = useState(false);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const [savedBoard, setSavedBoard] = useState(false);
  const [boardSaveCount, setBoardSaveCount] = useState(0);
  const [threadVotes, setThreadVotes] = useState<Record<string, number>>({});
  const [savedThreads, setSavedThreads] = useState<Record<string, boolean>>({});
  const [savedCards, setSavedCards] = useState<Record<string, boolean>>({});
  const [editingBoard, setEditingBoard] = useState<BoardRow | null>(null);
  const [boardDraftTitle, setBoardDraftTitle] = useState('');
  const [boardDraftDescription, setBoardDraftDescription] = useState('');
  const [boardDraftTags, setBoardDraftTags] = useState('');
  const [editingThread, setEditingThread] = useState<ThreadRow | null>(null);
  const [threadDraftTitle, setThreadDraftTitle] = useState('');
  const [threadDraftBody, setThreadDraftBody] = useState('');
  const [threadDraftType, setThreadDraftType] = useState<'question' | 'answer' | 'review' | 'recommendation'>('question');
  const [editingCard, setEditingCard] = useState<{ card: ProductCardRow; threadId: string } | null>(null);
  const [cardDraftName, setCardDraftName] = useState('');
  const [cardDraftDescription, setCardDraftDescription] = useState('');
  const [cardDraftExternalLink, setCardDraftExternalLink] = useState('');
  const [cardDraftPrice, setCardDraftPrice] = useState('');
  const [cardDraftCategory, setCardDraftCategory] = useState('product');

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

        const [ownerResult, threadResult, memberResult, followerResult] = await Promise.all([
          supabase.from('users').select('username, name, profile_photo').eq('id', resolvedBoard.user_id).maybeSingle(),
          supabase.from('threads').select('id, title, body, thread_type, is_pinned, is_solved, save_count, click_count, view_count, created_at, author_id').eq('board_id', resolvedBoard.id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('board_members').select('user_id').eq('board_id', resolvedBoard.id).limit(8),
          supabase.from('board_followers').select('user_id').eq('board_id', resolvedBoard.id),
        ]);

        setOwner(ownerResult.data || null);
        setBoardSaveCount((followerResult.data || []).length);

        const formattedThreads = ((threadResult.data || []) as Array<ThreadRow & { upvote_count?: number; downvote_count?: number; vote_score?: number }>).map((thread) => ({
          ...thread,
          upvote_count: thread.upvote_count || 0,
          downvote_count: thread.downvote_count || 0,
          vote_score: thread.vote_score || 0,
        })) as ThreadRow[];
        setThreads(formattedThreads);

        const threadIds = formattedThreads.map((item) => item.id);
        let boardCardIds: string[] = [];
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

          boardCardIds = (cardRows || []).map((card) => card.id);

          setThreadCards(groupedCards);
        } else {
          setThreadCards({});
        }

        if (authData.user) {
          const [inventoryResult, profileResult, membershipResult, joinRequestResult] = await Promise.all([
            supabase
              .from('product_cards')
              .select('id, name, description, price, category, image_url, file_url, external_link, verified_owner')
              .eq('creator_id', authData.user.id)
              .is('thread_id', null)
              .order('created_at', { ascending: false }),
            supabase.from('users').select('id, name, username, profile_photo').in('id', (memberResult.data || []).map((item) => item.user_id)),
            supabase.from('board_members').select('id').eq('board_id', resolvedBoard.id).eq('user_id', authData.user.id).maybeSingle(),
            supabase.from('board_join_requests').select('id, status').eq('board_id', resolvedBoard.id).eq('user_id', authData.user.id).eq('status', 'pending').maybeSingle(),
          ]);
          const voteRows = await getVotesForUser(authData.user.id, 'thread', threadIds);
          const saveRows = await getSavesForUser(authData.user.id, 'thread', threadIds);
          const cardSaveRows = await getSavesForUser(authData.user.id, 'card', boardCardIds);
          const { data: followedBoard } = await supabase.from('board_followers').select('id').eq('board_id', resolvedBoard.id).eq('user_id', authData.user.id).maybeSingle();

          setInventoryCards((inventoryResult.data || []) as InventoryCard[]);
          setMembers((profileResult.data || []) as BoardMember[]);
          setIsMember(!!membershipResult.data || resolvedBoard.user_id === authData.user.id);
          setHasPendingRequest(!!joinRequestResult.data);
          setSavedBoard(!!followedBoard);
          setThreadVotes(Object.fromEntries(voteRows.map((item) => [item.target_id, item.vote_value])));
          setSavedThreads(Object.fromEntries(saveRows.map((item) => [item.target_id, true])));
          setSavedCards(Object.fromEntries(cardSaveRows.map((item) => [item.target_id, true])));
        } else {
          setInventoryCards([]);
          setMembers([]);
          setIsMember(false);
          setHasPendingRequest(false);
          setSavedBoard(false);
          setThreadVotes({});
          setSavedThreads({});
          setSavedCards({});
        }
      } catch (boardError: unknown) {
        setError(boardError instanceof Error ? boardError.message : 'Failed to load board.');
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, [slug]);

  const boardSlug = board ? (board.slug || slugify(board.title)) : slug;
  const boardTitle = board?.title || 'Board';
  const ownerName = owner?.name || owner?.username || 'Unknown creator';
  const boardCards = useMemo(() => threads.flatMap((thread) => threadCards[thread.id] || []), [threadCards, threads]);
  const stats = useMemo(() => {
    const totalCards = threads.reduce((sum, thread) => sum + (threadCards[thread.id]?.length || 0), 0);

    return [
      { value: `${members.length || 0}`, label: 'members', icon: <FiUsers className="h-4 w-4" /> },
      { value: `${threads.length || 0}`, label: 'threads', icon: <FiMessageCircle className="h-4 w-4" /> },
      { value: `${totalCards}`, label: 'cards', icon: <FiBookmark className="h-4 w-4" /> },
      { value: `${boardSaveCount}`, label: 'saves', icon: <FiBookmark className="h-4 w-4" /> },
    ];
  }, [boardSaveCount, members.length, threadCards, threads]);

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
      const newCards: Array<{
        creator_id: string;
        thread_id: string;
        name: string;
        description: string | null;
        price: number | null;
        category: string;
        image_url: string | null;
        file_url: string | null;
        external_link: string | null;
        verified_owner: boolean;
      }> = [];
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

        newCards.push(...duplicateCards);

        const { error: cardError } = await supabase.from('product_cards').insert(duplicateCards);
        if (cardError) {
          throw cardError;
        }
      }

      if (externalCardLink.trim()) {
        const linkCard = {
          creator_id: user.id,
          thread_id: threadData.id,
          name: 'External link',
          description: 'Attached from thread composer',
          price: null,
          category: 'service',
          image_url: null,
          file_url: null,
          external_link: externalCardLink.trim(),
          verified_owner: false,
        };

        newCards.push(linkCard);

        const { error: linkError } = await supabase.from('product_cards').insert(linkCard);
        if (linkError) {
          throw linkError;
        }
      }

      setComposerTitle('');
      setComposerBody('');
      setComposerType('question');
      setSelectedCardIds([]);
      setExternalCardLink('');
      setShowInventory(false);

      const nextThread = { ...(threadData as ThreadRow), upvote_count: 0, downvote_count: 0, vote_score: 0 } as ThreadRow;
      setThreads((current) => [nextThread, ...current]);
      if (newCards.length > 0) {
        const { data: freshCards } = await supabase
          .from('product_cards')
          .select('id, name, description, price, category, image_url, file_url, external_link, verified_owner, save_count, click_count, purchase_count, usage_count, created_at, thread_id, creator_id')
          .eq('thread_id', nextThread.id)
          .order('created_at', { ascending: true });

        setThreadCards((current) => ({
          ...current,
          [nextThread.id]: (freshCards || []) as ProductCardRow[],
        }));
      }

      setReplyCounts((current) => ({ ...current, [nextThread.id]: 0 }));

      if (board.user_id !== user.id) {
        const actor = (user as any)?.user_metadata?.name || (user as any)?.user_metadata?.username || (user as any)?.email || 'Someone';
        await supabase.from('notifications').insert({
          user_id: board.user_id,
          type: newCards.length > 0 ? 'card_attached' : 'thread_created',
          title: newCards.length > 0 ? 'New thread with attachment' : 'New thread in your board',
          message: `${actor} posted "${threadData.title}" in ${board.title}`,
          from_user_id: user.id,
          board_id: board.id,
          thread_id: threadData.id,
        });
      }
    } catch (postError: unknown) {
      setError(postError instanceof Error ? postError.message : 'Failed to publish thread.');
    } finally {
      setPosting(false);
    }
  }

  const title = boardTitle;
  const stateLabel = board?.board_type === 'paid' ? 'Paid board' : board?.board_type === 'invite-only' ? 'Invite-only board' : 'Open board';
  const stateIcon = board?.board_type === 'paid' || board?.board_type === 'invite-only' ? <FiLock className="h-4 w-4" /> : <FiGlobe className="h-4 w-4" />;
  const canPost = !!user && (board?.is_public || board?.user_id === user?.id || isMember);
  const supportsPrice = (category: string) => category === 'product' || category === 'service';
  const cardTarget = (card: ProductCardRow) => card.external_link || card.file_url || `/keys`;

  async function shareBoard() {
    if (!board) return;
    const url = `${window.location.origin}/b/${boardSlug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: board.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareState('copied');
      window.setTimeout(() => setShareState('idle'), 1800);
    } catch {}
  }

  async function toggleBoardMembership() {
    if (!board) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (user.id === board.user_id) return;

    setJoining(true);
    setError(null);

    try {
      if (isMember) {
        const response = await fetch('/api/boards/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave_board', boardId: board.id, userId: user.id }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to leave board.');
        setIsMember(false);
        return;
      }

      if (board.board_type === 'invite-only') {
        const response = await fetch('/api/boards/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request_join', boardId: board.id, userId: user.id }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to request access.');
        setHasPendingRequest(true);
        return;
      }

      const actorName = (user as any)?.user_metadata?.name || (user as any)?.user_metadata?.username || (user as any)?.email || 'Someone';

      const { error: memberError } = await supabase.from('board_members').upsert({ board_id: board.id, user_id: user.id, role: 'member' }, { onConflict: 'board_id,user_id' });

      if (memberError) throw memberError;

      if (board.user_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: board.user_id,
          type: 'board_follow',
          title: 'New board join',
          message: `${actorName} joined ${board.title}`,
          from_user_id: user.id,
          board_id: board.id,
        });
      }

      setIsMember(true);
    } catch (membershipError: unknown) {
      setError(membershipError instanceof Error ? membershipError.message : 'Unable to update board membership.');
    } finally {
      setJoining(false);
    }
  }

  async function toggleBoardSave() {
    if (!board || !user) {
      router.push('/auth/login');
      return;
    }

    const query = supabase.from('board_followers').select('id').eq('board_id', board.id).eq('user_id', user.id).maybeSingle();
    const { data: existing } = await query;

    if (existing) {
      await supabase.from('board_followers').delete().eq('id', existing.id);
      setSavedBoard(false);
      setBoardSaveCount((current) => Math.max(0, current - 1));
      return;
    }

    await supabase.from('board_followers').insert({ board_id: board.id, user_id: user.id });
    setSavedBoard(true);
    setBoardSaveCount((current) => current + 1);
  }

  async function handleThreadVote(threadId: string, value: 1 | -1) {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const result = await setVoteForTarget(user.id, 'thread', threadId, value);
      setThreadVotes((current) => ({ ...current, [threadId]: result.activeVote }));
      setThreads((current) => current.map((thread) => thread.id === threadId ? {
        ...thread,
        upvote_count: result.upvoteCount,
        downvote_count: result.downvoteCount,
        vote_score: result.voteScore,
      } : thread));
    } catch (voteError: unknown) {
      setError(voteError instanceof Error ? voteError.message : 'Unable to vote on thread.');
    }
  }

  async function handleThreadSave(threadId: string) {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const result = await toggleSaveForTarget(user.id, 'thread', threadId);
      setSavedThreads((current) => ({ ...current, [threadId]: result.saved }));
      setThreads((current) => current.map((thread) => thread.id === threadId ? { ...thread, save_count: result.saveCount } : thread));
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save thread.');
    }
  }

  async function handleCardOpen(card: ProductCardRow) {
    await incrementCardClick(card.id);
    if (!card.thread_id) return;
    setThreadCards((current) => ({
      ...current,
      [card.thread_id as string]: (current[card.thread_id as string] || []).map((item) => item.id === card.id ? { ...item, click_count: (item.click_count || 0) + 1 } : item),
    }));
  }

  async function handleCardSave(cardId: string) {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const result = await toggleSaveForTarget(user.id, 'card', cardId);
      setSavedCards((current) => ({ ...current, [cardId]: result.saved }));
      setThreadCards((current) => Object.fromEntries(Object.entries(current).map(([threadId, cards]) => [
        threadId,
        cards.map((card) => card.id === cardId ? { ...card, save_count: result.saveCount } : card),
      ])));
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save card.');
    }
  }

  async function removeBoard() {
    if (!board || !user || board.user_id !== user.id) return;
    if (!window.confirm('Delete this board and all its threads/cards?')) return;

    const { error: deleteError } = await supabase
      .from('boards')
      .delete()
      .eq('id', board.id)
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete board.');
      return;
    }

    router.push('/boards');
  }

  function openBoardEditor() {
    if (!board || !user || board.user_id !== user.id) return;
    setEditingBoard(board);
    setBoardDraftTitle(board.title);
    setBoardDraftDescription(board.description || '');
    setBoardDraftTags((board.topic_tags || []).join(', '));
  }

  async function saveBoardEditor() {
    if (!editingBoard || !user || editingBoard.user_id !== user.id) return;

    const nextTitle = boardDraftTitle.trim();
    if (!nextTitle) {
      setError('Board title is required.');
      return;
    }

    const normalizedTags = boardDraftTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);

    const nextSlug = slugify(nextTitle);
    const { data, error: updateError } = await supabase
      .from('boards')
      .update({
        title: nextTitle,
        description: boardDraftDescription.trim() || null,
        topic_tags: normalizedTags.length > 0 ? normalizedTags : null,
        slug: nextSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingBoard.id)
      .eq('user_id', user.id)
      .select('id, title, description, is_public, board_type, access_price, invite_code, topic_tags, created_at, cover_image, user_id, slug')
      .single();

    if (updateError || !data) {
      setError(updateError?.message || 'Failed to update board.');
      return;
    }

    setBoard((current) => current ? { ...current, ...data } : current);
    setEditingBoard(null);
    router.push(`/b/${nextSlug}`);
  }

  function openThreadEditor(thread: ThreadRow) {
    if (!user || thread.author_id !== user.id) return;
    setEditingThread(thread);
    setThreadDraftTitle(thread.title);
    setThreadDraftBody(thread.body);
    setThreadDraftType((thread.thread_type as 'question' | 'answer' | 'review' | 'recommendation') || 'question');
  }

  async function saveThreadEditor() {
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
      .select('id, title, body, thread_type, is_pinned, is_solved, save_count, click_count, view_count, created_at, author_id')
      .single();

    if (updateError || !data) {
      setError(updateError?.message || 'Failed to update thread.');
      return;
    }

    setThreads((current) => current.map((item) => item.id === editingThread.id ? ({ ...(data as ThreadRow), upvote_count: item.upvote_count || 0, downvote_count: item.downvote_count || 0, vote_score: item.vote_score || 0 } as ThreadRow) : item));
    setEditingThread(null);
    router.push(`/b/${boardSlug}/t/${slugify(nextTitle)}`);
  }

  async function deleteThread(thread: ThreadRow) {
    if (!user || thread.author_id !== user.id) return;
    if (!window.confirm('Delete this thread?')) return;

    const { error: deleteError } = await supabase
      .from('threads')
      .delete()
      .eq('id', thread.id)
      .eq('author_id', user.id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete thread.');
      return;
    }

    setThreads((current) => current.filter((item) => item.id !== thread.id));
    setThreadCards((current) => {
      const next = { ...current };
      delete next[thread.id];
      return next;
    });
  }

  function openCardEditor(card: ProductCardRow, threadId: string) {
    if (!user || card.creator_id !== user.id) return;
    setEditingCard({ card, threadId });
    setCardDraftName(card.name);
    setCardDraftDescription(card.description || '');
    setCardDraftExternalLink(card.external_link || '');
    setCardDraftPrice(card.price !== null && card.price !== undefined ? String(card.price) : '');
    setCardDraftCategory(card.category || 'product');
  }

  async function saveCardEditor() {
    if (!editingCard || !user || editingCard.card.creator_id !== user.id) return;

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
      .eq('id', editingCard.card.id)
      .eq('creator_id', user.id)
      .select('id, name, description, price, category, image_url, file_url, external_link, verified_owner, save_count, click_count, purchase_count, usage_count, created_at, thread_id, creator_id')
      .single();

    if (updateError || !data) {
      setError(updateError?.message || 'Failed to update card.');
      return;
    }

    setThreadCards((current) => ({
      ...current,
      [editingCard.threadId]: (current[editingCard.threadId] || []).map((item) => item.id === editingCard.card.id ? (data as ProductCardRow) : item),
    }));
    setEditingCard(null);
  }

  async function deleteCard(card: ProductCardRow, threadId: string) {
    if (!user || card.creator_id !== user.id) return;
    if (!window.confirm('Delete this card?')) return;

    const { error: deleteError } = await supabase
      .from('product_cards')
      .delete()
      .eq('id', card.id)
      .eq('creator_id', user.id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete card.');
      return;
    }

    setThreadCards((current) => ({
      ...current,
      [threadId]: (current[threadId] || []).filter((item) => item.id !== card.id),
    }));
  }

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
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#12121A] shadow-[0_24px_90px_rgba(0,0,0,0.28)] sm:rounded-[32px]">
        <div className="bg-[linear-gradient(135deg,rgba(212,175,55,0.22),rgba(18,18,26,0.94)),radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_25%)] p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[#D4AF37]">
            {stateIcon}
            {stateLabel}
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-black/30 text-xl font-semibold text-[#D4AF37] sm:h-16 sm:w-16 sm:text-2xl">
                  {title[0]}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[#F0F0F5] sm:text-3xl lg:text-4xl">{title}</h1>
                  <p className="mt-1 text-sm text-[#9CA3AF] sm:mt-2">@{ownerName} · {board.topic_tags?.[0] || 'Knowledge board'} · Verified</p>
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-6 text-[#C7CAD1] sm:leading-7">
                {board.description || 'A searchable board for questions, answers, reviews, and recommendations that stay useful over time.'}
              </p>

              <div className="flex flex-wrap gap-2 text-sm text-[#9CA3AF]">
                {stats.map((stat) => (
                  <span key={stat.label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0A0A0F] px-3 py-1.5">
                    {stat.icon}
                    {stat.value} {stat.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {user?.id === board.user_id && (
                <>
                  <button type="button" onClick={openBoardEditor} title="Edit board" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#F0F0F5]">
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                  <button onClick={removeBoard} title="Delete board" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-300">
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              {board.board_type === 'paid' ? (
                <Link href={`/checkout?product=board-access&title=${encodeURIComponent(title)}&price=${encodeURIComponent(String(board.access_price || 9))}`} className="inline-flex items-center justify-center rounded-full bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] sm:px-5">
                  Subscribe ${board.access_price || 9}/month
                </Link>
              ) : (
                <button onClick={toggleBoardMembership} disabled={joining || hasPendingRequest} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60 sm:px-5">
                  {isMember ? <FiLogOut className="h-4 w-4" /> : board.board_type === 'invite-only' ? <FiUserPlus className="h-4 w-4" /> : <FiUsers className="h-4 w-4" />}
                  {isMember ? 'Leave' : hasPendingRequest ? 'Pending' : board.board_type === 'invite-only' ? 'Request access' : 'Join'}
                </button>
              )}
              <button onClick={toggleBoardSave} title="Save board" className={`inline-flex h-11 w-11 items-center justify-center rounded-full border ${savedBoard ? 'border-[#D4AF37]/35 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}>
                <FiBookmark className="h-4 w-4" />
              </button>
              <button onClick={shareBoard} title="Share board" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#F0F0F5]">
                {shareState === 'copied' ? <FiCheck className="h-4 w-4 text-[#10B981]" /> : <FiShare2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#0A0A0F] p-4 sm:p-6">
          {!canPost && (
            <div className="mb-6 rounded-[28px] border border-white/10 bg-[#1A1A24] p-5 text-sm leading-7 text-[#9CA3AF]">
              Posting is limited here until you join this board. The rest of the board remains searchable and readable.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              {threads.length > 0 ? threads.map((thread) => (
                <article key={thread.id} className={`rounded-[18px] border border-white/10 bg-[#121212] p-3 sm:p-4 ${thread.is_pinned ? 'border-l-4 border-l-[#D4AF37]' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#9CA3AF]">
                    <FiMessageCircle className="h-4 w-4 text-[#D4AF37]" />
                    {thread.thread_type}
                    {thread.is_pinned && <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-0.5 text-[#D4AF37]">Pinned</span>}
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-[#F0F0F5] sm:text-2xl">{thread.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF] sm:leading-7">{thread.body}</p>
                  {threadCards[thread.id]?.length ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {threadCards[thread.id].slice(0, 3).map((card) => (
                        <div key={card.id} className="rounded-2xl border border-white/10 bg-[#0A0A0F] p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-[#F0F0F5]">{card.name}</div>
                              <div className="mt-1 text-sm leading-6 text-[#9CA3AF]">{card.description || 'Recommendation card attached to this thread.'}</div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#9CA3AF]">
                                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">{card.category}</span>
                                {supportsPrice(card.category) && card.price !== null ? <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">${card.price}</span> : null}
                                <span className="rounded-full border border-[#10B981]/20 bg-[#10B981]/10 px-2.5 py-1 text-[#10B981]">{card.verified_owner ? 'Verified owner' : 'External'}</span>
                              </div>
                            </div>
                            <Link onClick={() => void handleCardOpen(card)} href={cardTarget(card)} target={cardTarget(card).startsWith('http') ? '_blank' : undefined} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-2 text-sm font-semibold text-[#D4AF37]">
                              Open
                              <FiArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button onClick={() => handleCardSave(card.id)} className={`rounded-full border px-3 py-1 text-xs ${savedCards[card.id] ? 'border-[#D4AF37]/35 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/20 bg-white/[0.03] text-[#F0F0F5]'}`}>Save</button>
                              {user?.id === card.creator_id && (
                                <>
                                  <button onClick={() => openCardEditor(card, thread.id)} className="rounded-full border border-white/20 bg-white/[0.03] px-3 py-1 text-xs text-[#F0F0F5]">Edit</button>
                                  <button onClick={() => deleteCard(card, thread.id)} className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs text-red-300">Delete</button>
                                </>
                              )}
                            </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#9CA3AF]">
                    <Badge text={`${replyCounts[thread.id] || 0}`} icon={<FiMessageCircle className="h-3.5 w-3.5" />} />
                    <Badge text={`${thread.vote_score || 0}`} icon={<FiChevronUp className="h-3.5 w-3.5" />} />
                    <Badge text={`${thread.save_count}`} icon={<FiCheck className="h-3.5 w-3.5" />} />
                    <Badge text={`${thread.view_count}`} icon={<FiGlobe className="h-3.5 w-3.5" />} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={() => handleThreadVote(thread.id, 1)} title="Upvote" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${threadVotes[thread.id] === 1 ? 'border-[#D4AF37]/40 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}>
                      <FiChevronUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleThreadVote(thread.id, -1)} title="Downvote" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${threadVotes[thread.id] === -1 ? 'border-red-400/40 bg-red-500/10 text-red-300' : 'border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}>
                      <FiChevronDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleThreadSave(thread.id)} title="Save thread" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${savedThreads[thread.id] ? 'border-[#D4AF37]/35 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}>
                      <FiBookmark className="h-4 w-4" />
                    </button>
                    <Link href={`/b/${boardSlug}/t/${slugify(thread.title)}`} className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-sm font-semibold text-[#D4AF37]">
                      Open thread
                      <FiArrowRight className="h-4 w-4" />
                    </Link>
                    {user?.id === thread.author_id && (
                      <>
                        <button onClick={() => openThreadEditor(thread)} title="Edit thread" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/[0.03] text-[#F0F0F5]">
                          <FiEdit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteThread(thread)} title="Delete thread" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-red-400/30 bg-red-400/10 text-red-300">
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )) : (
                <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6 text-sm text-[#9CA3AF]">
                  No threads yet. Start the board with the first question or recommendation.
                </div>
              )}

              <section className="rounded-[14px] border border-white/10 bg-[#121212] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Cards</div>
                    <div className="mt-2 text-xl font-semibold text-[#F0F0F5]">Board recommendations</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-[#0A0A0F] px-3 py-1 text-xs text-[#9CA3AF]">{boardCards.length} visible</div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {boardCards.length > 0 ? boardCards.map((card) => (
                    <div key={card.id} className="rounded-[12px] border border-white/10 bg-[#0A0A0F] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link onClick={() => void handleCardOpen(card)} href={cardTarget(card)} target={cardTarget(card).startsWith('http') ? '_blank' : undefined} className="text-base font-semibold text-[#F0F0F5] hover:text-[#D4AF37]">{card.name}</Link>
                          <div className="mt-1 text-sm text-[#9CA3AF]">{card.description || 'Attached recommendation'}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8D8D8D]">
                            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">{card.category}</span>
                            {supportsPrice(card.category) && card.price !== null ? <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">${card.price}</span> : null}
                            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">{card.click_count} clicks</span>
                            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1">{card.save_count} saves</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleCardSave(card.id)} className={`rounded-full border px-3 py-2 text-xs ${savedCards[card.id] ? 'border-[#D4AF37]/35 bg-[#D4AF37]/12 text-[#D4AF37]' : 'border-white/20 bg-white/[0.03] text-[#F0F0F5]'}`}>Save</button>
                          <Link onClick={() => void handleCardOpen(card)} href={cardTarget(card)} target={cardTarget(card).startsWith('http') ? '_blank' : undefined} className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#D4AF37]">
                            Open
                            <FiArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-[12px] border border-white/10 bg-[#0A0A0F] p-4 text-sm text-[#9CA3AF] md:col-span-2">
                      No cards attached to this board yet. Once a thread includes a recommendation, it will appear here as well as inside the thread.
                    </div>
                  )}
                </div>
              </section>

              <div className="rounded-[18px] border border-white/10 bg-[#121212] p-3 shadow-[0_24px_90px_rgba(0,0,0,0.24)] sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#D4AF37]">Composer</div>
                    <div className="mt-2 text-lg font-semibold text-[#F0F0F5] sm:text-xl">Start a thread</div>
                  </div>
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
                    onChange={(event) => setComposerBody(event.target.value)}
                    placeholder="Write a question, answer, review, or recommendation..."
                    className="min-h-[120px] rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-sm leading-6 text-[#F0F0F5] outline-none placeholder:text-[#6B7280] sm:min-h-[150px] sm:leading-7"
                    disabled={!canPost}
                  />

                  <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em] text-[#9CA3AF]">
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

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      onClick={() => setShowInventory((current) => !current)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]"
                      disabled={!canPost}
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
                      <Link onClick={() => void handleCardOpen(card)} href={cardTarget(card)} target={cardTarget(card).startsWith('http') ? '_blank' : undefined} className="text-sm font-semibold text-[#F0F0F5] hover:text-[#D4AF37]">{card.name}</Link>
                      <div className="mt-1 text-sm text-[#9CA3AF]">{card.description || 'Attached recommendation'}</div>
                      <div className="mt-2 text-xs text-[#9CA3AF]">{card.verified_owner ? 'Verified owner' : 'External'}{supportsPrice(card.category) && card.price !== null ? ` · $${card.price}` : ''}</div>
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

      <SimpleModal open={!!editingBoard} title="Edit board" description="Update the board title, description, and topics." onClose={() => setEditingBoard(null)} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Board title</label>
            <input value={boardDraftTitle} onChange={(event) => setBoardDraftTitle(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none" placeholder="Board title" />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Description</label>
            <textarea value={boardDraftDescription} onChange={(event) => setBoardDraftDescription(event.target.value)} className="min-h-[110px] w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-3 text-sm text-[#F5F5F5] outline-none" placeholder="What is this board for?" />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Topics (comma separated)</label>
            <input value={boardDraftTags} onChange={(event) => setBoardDraftTags(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none" placeholder="design, tools, reviews" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingBoard(null)} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#F0F0F5]">Cancel</button>
            <button type="button" onClick={saveBoardEditor} className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">Save</button>
          </div>
        </div>
      </SimpleModal>

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
            <textarea value={threadDraftBody} onChange={(event) => setThreadDraftBody(event.target.value)} className="min-h-[140px] w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-3 text-sm text-[#F5F5F5] outline-none" placeholder="What would you like to share?" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditingThread(null)} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#F0F0F5]">Cancel</button>
            <button type="button" onClick={saveThreadEditor} className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">Save thread</button>
          </div>
        </div>
      </SimpleModal>

      <SimpleModal open={!!editingCard} title="Edit card" description="Update the recommendation card content and links." onClose={() => setEditingCard(null)} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Card category</label>
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
            <button type="button" onClick={saveCardEditor} className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">Save card</button>
          </div>
        </div>
      </SimpleModal>

      {showInventory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-[16px] border border-white/10 bg-[#0F0F0F] p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <div className="text-sm font-semibold text-[#F5F5F5]">Attach from inventory</div>
                <div className="text-xs text-[#8D8D8D]">Select cards to attach in your new thread.</div>
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
                  No inventory items yet. Add one in <Link href="/keys/inventory/new" className="text-[#D4AF37] hover:text-[#F0C94A]">inventory</Link>.
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
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</div>;
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

function Badge({ text, icon }: { text: string; icon?: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0A0A0F] px-3 py-1 text-xs text-[#F0F0F5]">{icon}{text}</span>;
}