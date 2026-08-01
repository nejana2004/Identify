"use client";

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  FiArrowRight,
  FiBookmark,
  FiCheck,
  FiClock,
  FiCopy,
  FiEye,
  FiFileText,
  FiGlobe,
  FiHeart,
  FiHash,
  FiLock,
  FiMessageCircle,
  FiPlus,
  FiSearch,
  FiShare2,
  FiShield,
  FiStar,
  FiUsers,
  FiX,
} from 'react-icons/fi';

type Board = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
  cover_image: string | null;
  users: {
    id: string;
    username: string;
    name: string;
    profile_photo?: string | null;
  };
};

type Curator = {
  id: string;
  username: string;
  name: string;
  profile_photo: string | null;
  bio: string | null;
};

type Pin = {
  id: string;
  board_id: string;
  profile_id: string;
  created_at: string;
  users: {
    id: string;
    username: string;
    name: string;
    profile_photo: string | null;
    bio: string | null;
    pin_count?: number;
    view_count?: number;
  };
};

type BoardMember = {
  id: string;
  user_id: string;
  role: string;
  users: {
    name: string;
    username: string;
    profile_photo: string | null;
  };
};

type Thread = {
  id: string;
  title: string;
  type: 'question' | 'answer' | 'review' | 'recommendation';
  body: string;
  author: string;
  timestamp: string;
  saves: number;
  replies: number;
  views: number;
  tags: string[];
  isPinned?: boolean;
  cards?: ThreadCard[];
};

type ThreadCard = {
  id: string;
  title: string;
  type: 'product' | 'place' | 'service';
  description: string;
  why: string;
  link: string;
  image?: string | null;
  verifiedOwner?: boolean;
  saves: number;
  clicks: number;
};

const topics = ['Threads', 'Cards', 'People', 'About'];

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [curator, setCurator] = useState<Curator | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'Threads' | 'Cards' | 'People' | 'About'>('Threads');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [followLoading, setFollowLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const threadList = useMemo<Thread[]>(() => {
    const boardTitle = board?.title || 'this board';
    const curatorName = curator?.name || 'the curator';

    const cardThreads = pins.slice(0, 4).map((pin, index) => ({
      id: pin.id,
      title: index === 0 ? `Why ${pin.users.name} is worth following` : `${pin.users.name} — a recommendation worth saving`,
      type: (index % 3 === 0 ? 'recommendation' : index % 3 === 1 ? 'review' : 'answer') as Thread['type'],
      body: index === 0
        ? `This board collects clear, useful recommendations around ${boardTitle}.`
        : `A useful post from ${pin.users.name} with a structured card attached and a short explanation of why it matters.`,
      author: pin.users.username,
      timestamp: `${index + 1}d ago`,
      saves: Math.max(12, pin.users.pin_count || 0),
      replies: 3 + index * 2,
      views: Math.max(98, pin.users.view_count || 0),
      tags: ['Saved', 'Useful', 'Verified owner'],
      cards: [
        {
          id: `${pin.id}-card`,
          title: pin.users.name,
          type: 'product',
          description: pin.users.bio || `A useful recommendation from ${pin.users.name}.`,
          why: `I keep returning to this because it solves a real problem for people in ${boardTitle}.`,
          link: '#',
          image: pin.users.profile_photo,
          verifiedOwner: true,
          saves: Math.max(16, pin.users.pin_count || 0),
          clicks: Math.max(8, Math.floor((pin.users.view_count || 0) / 10)),
        },
      ],
    }));

    return [
      {
        id: 'pinned',
        title: `Welcome to ${boardTitle}`,
        type: 'question',
        body: `Ask questions, post recommendations, and attach cards that explain why you recommend them. ${curatorName} curates this board for useful, searchable knowledge.`,
        author: curator?.username || 'creator',
        timestamp: 'Pinned',
        saves: 92,
        replies: 6,
        views: 1247,
        tags: ['Pinned', board?.is_public ? 'Open board' : 'Invite-only', 'Searchable'],
        isPinned: true,
        cards: [
          {
            id: 'welcome-card',
            title: 'How this board works',
            type: 'service',
            description: 'Every answer can include a card with a short reason and an external link.',
            why: 'Useful things should be easy to explain, save, and click later.',
            link: '#',
            verifiedOwner: true,
            saves: 203,
            clicks: 47,
          },
        ],
      },
      {
        id: 'q1',
        title: `What's the best first question to ask here?`,
        type: 'question',
        body: `You can ask about tools, places, services, workflows, or products that matter to this board's topic.`,
        author: 'seeker_01',
        timestamp: '2h ago',
        saves: 34,
        replies: 8,
        views: 892,
        tags: ['Question', 'Search intent', 'Trust'],
      },
      {
        id: 'a1',
        title: 'A structured answer with a recommendation card',
        type: 'answer',
        body: `The key is to pair the answer with a card and a short why note. That keeps the board useful and easy to revisit later.`,
        author: curator?.username || 'creator',
        timestamp: '1d ago',
        saves: 81,
        replies: 5,
        views: 1203,
        tags: ['Answer', 'Creator', 'Top contributor'],
        cards: [
          {
            id: 'answer-card',
            title: 'Recommended card example',
            type: 'product',
            description: 'A compact recommendation example that shows the structure expected in replies.',
            why: 'This is the kind of thing that should be attached to a helpful answer.',
            link: '#',
            verifiedOwner: true,
            saves: 47,
            clicks: 18,
          },
        ],
      },
      ...cardThreads,
    ];
  }, [board, curator, pins]);

  useEffect(() => {
    async function loadBoardData() {
      setLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const { data: boardData, error: boardError } = await supabase
          .from('boards')
          .select('id, title, description, is_public, created_at, user_id, cover_image')
          .eq('id', resolvedParams.id)
          .single();

        if (boardError) throw boardError;

        const { data: userData } = await supabase
          .from('users')
          .select('id, username, name, profile_photo')
          .eq('id', boardData.user_id)
          .maybeSingle();

        const completeBoard: Board = {
          ...boardData,
          users: userData || {
            id: boardData.user_id,
            username: 'unknown',
            name: 'Unknown creator',
            profile_photo: null,
          },
        };

        if (!completeBoard.is_public && (!user || user.id !== completeBoard.user_id)) {
          router.push('/boards');
          return;
        }

        setBoard(completeBoard);
        setIsOwner(!!user && user.id === completeBoard.user_id);

        const { data: curatorData } = await supabase
          .from('users')
          .select('id, username, name, profile_photo, bio')
          .eq('id', completeBoard.user_id)
          .maybeSingle();

        if (curatorData) setCurator(curatorData);

        const { data: followerRows } = await supabase
          .from('board_followers')
          .select('id')
          .eq('board_id', resolvedParams.id);

        setFollowerCount(followerRows?.length || 0);

        if (user) {
          const { data: followData } = await supabase
            .from('board_followers')
            .select('id')
            .eq('board_id', resolvedParams.id)
            .eq('user_id', user.id)
            .maybeSingle();
          setIsFollowing(!!followData);

          const { data: memberData } = await supabase
            .from('board_members')
            .select('id')
            .eq('board_id', resolvedParams.id)
            .eq('user_id', user.id)
            .maybeSingle();
          setIsMember(!!memberData);

          const { data: requestData } = await supabase
            .from('board_join_requests')
            .select('id')
            .eq('board_id', resolvedParams.id)
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();
          setHasRequested(!!requestData);

          const { data: pinData } = await supabase
            .from('pins')
            .select('id')
            .eq('board_id', resolvedParams.id)
            .eq('profile_id', user.id)
            .maybeSingle();
          setIsPinned(!!pinData);
        }

        const { data: pinRows } = await supabase
          .from('pins')
          .select(`
            id, board_id, profile_id, created_at,
            users!profile_id(id, username, name, profile_photo, bio)
          `)
          .eq('board_id', resolvedParams.id)
          .order('created_at', { ascending: false });

        setPins((pinRows || []) as Pin[]);

        const { data: memberRows } = await supabase
          .from('board_members')
          .select(`
            id, user_id, role,
            users:user_id (name, username, profile_photo)
          `)
          .eq('board_id', resolvedParams.id);

        setMembers((memberRows || []) as BoardMember[]);
      } catch (error) {
        console.error('Error loading board data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBoardData();
  }, [resolvedParams.id, router]);

  const shareBoard = async () => {
    const url = `${window.location.origin}/boards/${resolvedParams.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    }
  };

  const toggleFollow = async () => {
    if (!user || !board) return;
    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase.from('board_followers').delete().eq('board_id', board.id).eq('user_id', user.id);
        if (!error) {
          setIsFollowing(false);
          setFollowerCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        const { error } = await supabase.from('board_followers').insert({ board_id: board.id, user_id: user.id });
        if (!error) {
          setIsFollowing(true);
          setFollowerCount((prev) => prev + 1);
        }
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const requestToJoin = async () => {
    if (!user || !board) return;
    setJoinLoading(true);

    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_join', boardId: board.id, userId: user.id }),
      });

      const data = await response.json();
      if (data.success) {
        setHasRequested(true);
        setJoinSuccess(true);
      } else {
        alert(data.error || 'Failed to send request');
      }
    } catch {
      alert('Failed to send request');
    } finally {
      setJoinLoading(false);
    }
  };

  const confirmLeaveBoard = async () => {
    if (!user || !board) return;
    setLeaveLoading(true);

    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave_board', boardId: board.id, userId: user.id }),
      });

      const data = await response.json();
      if (data.success) {
        setIsPinned(false);
        setIsMember(false);
        setLeaveSuccess(true);
      } else {
        alert(data.error || 'Failed to leave board');
      }
    } catch {
      alert('Failed to leave board');
    } finally {
      setLeaveLoading(false);
    }
  };

  const generateInviteLink = async () => {
    if (!user || !board) return;
    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_invite', boardId: board.id, inviterId: user.id }),
      });
      const data = await response.json();
      if (data.success) {
        setInviteLink(`${window.location.origin}/boards/join/${data.inviteCode}`);
        setShowInviteModal(true);
      } else {
        alert(data.error || 'Failed to create invite link');
      }
    } catch {
      alert('Failed to create invite link');
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1800);
    }
  };

  const currentThreadCount = threadList.length;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#9CA3AF]">Loading board...</div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#9CA3AF]">Board not found.</div>
    );
  }

  const isInviteOnly = !board.is_public;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#12121A] shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
          <div
            className="relative min-h-[230px] bg-[linear-gradient(135deg,rgba(212,175,55,0.22),rgba(26,26,36,0.94))]"
            style={board.cover_image ? { backgroundImage: `linear-gradient(135deg, rgba(212,175,55,0.16), rgba(5,5,8,0.92)), url(${board.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_24%)]" />
            <div className="relative flex h-full flex-col justify-between p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-[#D4AF37]">
                {isInviteOnly ? <FiLock className="h-4 w-4" /> : <FiGlobe className="h-4 w-4" />}
                {isInviteOnly ? 'Invite-only board' : 'Open board'}
              </div>

              <div className="flex items-end justify-between gap-6">
                <div className="space-y-3">
                  <div className="text-sm text-[#9CA3AF]">{board.users.username}</div>
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#F0F0F5] sm:text-5xl">{board.title}</h1>
                  <p className="max-w-2xl text-sm leading-7 text-[#C7CAD1] sm:text-base">{board.description || 'A board for useful questions, answers, reviews, and recommendations.'}</p>
                </div>

                <div className="hidden shrink-0 rounded-full border border-[#D4AF37]/25 bg-[#0A0A0F]/70 p-2 sm:block">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-black/30 text-[#D4AF37]">
                    <FiShield className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#0A0A0F] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#9CA3AF]">
              <Stat value={`${followerCount}`} label="followers" icon={<FiUsers className="h-4 w-4" />} />
              <Stat value={`${currentThreadCount}`} label="threads" icon={<FiMessageCircle className="h-4 w-4" />} />
              <Stat value={`${pins.length}`} label="cards" icon={<FiFileText className="h-4 w-4" />} />
              <Stat value={board.is_public ? 'public' : 'invite-only'} label="access" icon={board.is_public ? <FiGlobe className="h-4 w-4" /> : <FiLock className="h-4 w-4" />} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${isFollowing ? 'border border-[#D4AF37]/30 bg-white/[0.03] text-[#F0F0F5]' : 'bg-[#D4AF37] text-[#0A0A0F] hover:bg-[#F0C94A]'}`}
              >
                {isFollowing ? 'Following board' : 'Follow board'}
              </button>

              {isInviteOnly && !isMember && !isOwner ? (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#F0F0F5] transition hover:bg-white/[0.06]"
                >
                  Request access
                </button>
              ) : isInviteOnly && isMember ? (
                <button className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/25 bg-[#10B981]/10 px-5 py-3 text-sm font-semibold text-[#10B981]">
                  <FiCheck className="h-4 w-4" /> Member
                </button>
              ) : null}

              {isOwner && isInviteOnly && (
                <button
                  onClick={generateInviteLink}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#F0F0F5] transition hover:bg-white/[0.06]"
                >
                  <FiUsers className="h-4 w-4 text-[#D4AF37]" /> Invite link
                </button>
              )}

              <button
                onClick={shareBoard}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#F0F0F5] transition hover:bg-white/[0.06]"
              >
                {copyState === 'copied' ? <FiCheck className="h-4 w-4 text-[#10B981]" /> : <FiShare2 className="h-4 w-4 text-[#D4AF37]" />}
                {copyState === 'copied' ? 'Copied' : 'Share'}
              </button>

              {isMember && !isOwner && (
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-[#EF4444]/25 bg-[#EF4444]/10 px-5 py-3 text-sm font-semibold text-[#EF4444]"
                >
                  Leave board
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#12121A] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Trust signals</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Searchable, transparent, useful</h2>
            </div>
            <FiStar className="h-5 w-5 text-[#D4AF37]" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SignalCard title="Saved" value="203" description="Threads and cards people return to." icon={<FiBookmark className="h-4 w-4" />} />
            <SignalCard title="Clicks" value="47" description="Structured cards that get action." icon={<FiArrowRight className="h-4 w-4" />} />
            <SignalCard title="Followers" value={`${followerCount}`} description="People tracking this topic." icon={<FiUsers className="h-4 w-4" />} />
            <SignalCard title="Creator" value="Verified" description="Visible ownership and trust cues." icon={<FiShield className="h-4 w-4" />} />
          </div>

          {curator && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                  {curator.profile_photo ? (
                    <Image src={curator.profile_photo} alt={curator.name} width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    <FiShield className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm text-[#9CA3AF]">Curator</div>
                  <div className="text-lg font-semibold text-[#F0F0F5]">{curator.name}</div>
                  <div className="text-sm text-[#9CA3AF]">@{curator.username}</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{curator.bio || 'This board is curated for useful recommendations, plain-language answers, and transparent trust signals.'}</p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#9CA3AF]"><FiSearch className="h-4 w-4 text-[#D4AF37]" /> Board context</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[board.is_public ? 'Public' : 'Invite-only', 'Questions', 'Answers', 'Reviews', 'Recommendations', 'Cards'].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-[#0A0A0F] px-3 py-1 text-xs text-[#F0F0F5]">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-[24px] border border-white/10 bg-[#0A0A0F] p-2">
        {topics.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`rounded-full px-4 py-2 text-sm transition ${activeTab === tab ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'text-[#9CA3AF] hover:bg-white/[0.04] hover:text-[#F0F0F5]'}`}
          >
            {tab}
          </button>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {activeTab === 'Threads' && threadList.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}

          {activeTab === 'Cards' && (
            <div className="grid gap-4 md:grid-cols-2">
              {pins.map((pin) => (
                <CardPreview key={pin.id} pin={pin} />
              ))}
              {pins.length === 0 && (
                <EmptyPanel title="No cards yet" text="Use the / command in a reply to attach a product, place, or service card." />
              )}
            </div>
          )}

          {activeTab === 'People' && (
            <div className="grid gap-4 md:grid-cols-2">
              {members.map((member) => (
                <div key={member.id} className="rounded-[24px] border border-white/10 bg-[#12121A] p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]">
                      {member.users.profile_photo ? (
                        <Image src={member.users.profile_photo} alt={member.users.name} width={48} height={48} className="h-full w-full object-cover" />
                      ) : (
                        <FiUsers className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-base font-semibold text-[#F0F0F5]">{member.users.name}</div>
                      <div className="text-sm text-[#9CA3AF]">@{member.users.username}</div>
                    </div>
                  </div>
                  <div className="mt-4 inline-flex rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-[#9CA3AF]">{member.role}</div>
                </div>
              ))}
              {!members.length && <EmptyPanel title="No members listed" text="Invite people to this board or approve join requests to show them here." />}
            </div>
          )}

          {activeTab === 'About' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Board details</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-[#9CA3AF]">
                  <p>{board.description || 'A knowledge board for useful questions, answers, cards, and trust signals.'}</p>
                  <p>Use it for product recommendations, local guides, services, or expert knowledge.</p>
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Access</div>
                <div className="mt-3 space-y-3 text-sm leading-6 text-[#9CA3AF]">
                  <p>{board.is_public ? 'Anyone can view and discover this board.' : 'Members only see the full board. Non-members can request access.'}</p>
                  {isOwner && <p>You can create invite links, approve requests, and manage membership here.</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Composer</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Ask, answer, or recommend</h2>
              </div>
              <FiMessageCircle className="h-5 w-5 text-[#D4AF37]" />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0A0A0F] p-4 text-sm text-[#9CA3AF]">
              <div className="flex items-center gap-2 text-[#F0F0F5]"><FiMessageCircle className="h-4 w-4 text-[#D4AF37]" /> Drop a question or recommendation...</div>
              <p className="mt-2">Type / to attach a card from your inventory.</p>
            </div>

            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
              Send it
              <FiArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#D4AF37]"><FiHash className="h-4 w-4" /> Recent cards</div>
            <div className="mt-4 space-y-3">
              {pins.slice(0, 3).map((pin) => (
                <div key={pin.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-semibold text-[#F0F0F5]">{pin.users.name}</div>
                  <div className="mt-1 text-sm text-[#9CA3AF]">Why I recommend this: clear, useful, and easy to return to.</div>
                </div>
              ))}
              {!pins.length && <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#9CA3AF]">Cards will appear here once people attach structured recommendations.</div>}
            </div>
          </div>
        </aside>
      </section>

      {showJoinModal && (
        <ModalShell title={`Request access to ${board.title}`} onClose={() => setShowJoinModal(false)}>
          {joinSuccess ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]"><FiCheck className="h-8 w-8" /></div>
              <div className="text-2xl font-semibold text-[#F0F0F5]">Request sent</div>
              <p className="text-sm leading-6 text-[#9CA3AF]">The curator will review your request. You'll get notified when they respond.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[#9CA3AF]">{curator?.name || 'The curator'} manages this board. Tell them why you'd be a useful member.</p>
              <textarea className="min-h-28 w-full rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" placeholder="Why do you want to join?" />
              <button onClick={requestToJoin} disabled={joinLoading} className="inline-flex w-full items-center justify-center rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
                {joinLoading ? 'Sending...' : 'Send request'}
              </button>
            </div>
          )}
        </ModalShell>
      )}

      {showLeaveModal && (
        <ModalShell title={`Leave ${board.title}?`} onClose={() => setShowLeaveModal(false)}>
          {leaveSuccess ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]"><FiCheck className="h-8 w-8" /></div>
              <div className="text-2xl font-semibold text-[#F0F0F5]">You left the board</div>
              <p className="text-sm leading-6 text-[#9CA3AF]">You can rejoin later if the board remains open or you receive a new invite.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-6 text-[#9CA3AF]">You will stop seeing private content for this board unless the curator adds you again.</p>
              <button onClick={confirmLeaveBoard} disabled={leaveLoading} className="inline-flex w-full items-center justify-center rounded-2xl bg-[#EF4444] px-4 py-3 text-sm font-semibold text-white">
                {leaveLoading ? 'Leaving...' : 'Leave board'}
              </button>
            </div>
          )}
        </ModalShell>
      )}

      {showInviteModal && (
        <ModalShell title="Invite link created" onClose={() => setShowInviteModal(false)}>
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#0A0A0F] p-4 text-sm text-[#9CA3AF] break-all">{inviteLink}</div>
            <div className="flex gap-3">
              <button onClick={copyInviteLink} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
                {inviteCopied ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}
                {inviteCopied ? 'Copied' : 'Copy link'}
              </button>
              <button onClick={() => setShowInviteModal(false)} className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-[#F0F0F5]">
                Close
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ThreadCard({ thread }: { thread: Thread }) {
  const typeLabel = thread.type === 'question' ? 'Question' : thread.type === 'answer' ? 'Answer' : thread.type === 'review' ? 'Review' : 'Recommendation';

  return (
    <article className={`rounded-[28px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.2)] ${thread.isPinned ? 'border-l-4 border-l-[#D4AF37]' : thread.type === 'question' ? 'border-l-4 border-l-[#3B82F6]' : 'border-l-4 border-l-[#D4AF37]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[#F0F0F5]">{typeLabel}</span>
            {thread.isPinned && <span className="rounded-full bg-[#D4AF37] px-3 py-1 text-[#0A0A0F]">Pinned</span>}
            {thread.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{tag}</span>
            ))}
          </div>
          <h3 className="mt-4 text-2xl font-semibold text-[#F0F0F5]">{thread.title}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#C7CAD1]">{thread.body}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-[#9CA3AF]">{thread.timestamp}</div>
      </div>

      {thread.cards?.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {thread.cards.map((card) => (
            <article key={card.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0A0A0F]">
              <div className="h-32 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(26,26,36,0.95))]">
                {card.image ? (
                  <Image src={card.image} alt={card.title} width={480} height={180} className="h-full w-full object-cover opacity-95" />
                ) : null}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-[#F0F0F5]">{card.title}</div>
                    <div className="text-sm text-[#9CA3AF]">{card.type}</div>
                  </div>
                  {card.verifiedOwner && <span className="rounded-full bg-[#10B981]/15 px-3 py-1 text-xs font-semibold text-[#10B981]">Verified owner</span>}
                </div>
                <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{card.description}</p>
                <p className="mt-3 text-sm italic text-[#C7CAD1]">"{card.why}"</p>
                <div className="mt-4 flex items-center justify-between text-xs text-[#9CA3AF]">
                  <span>{card.saves} saves · {card.clicks} clicks</span>
                  <a href={card.link} className="inline-flex items-center gap-1 text-[#D4AF37] hover:text-[#F0C94A]">Open <FiArrowRight className="h-4 w-4" /></a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[#9CA3AF]">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1"><FiMessageCircle className="h-4 w-4" /> {thread.replies} replies</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1"><FiHeart className="h-4 w-4" /> {thread.saves} saves</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1"><FiEye className="h-4 w-4" /> {thread.views} views</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1"><FiBookmark className="h-4 w-4" /> Save</span>
      </div>
    </article>
  );
}

function CardPreview({ pin }: { pin: Pin }) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-white/10 bg-[#12121A]">
      <div className="h-32 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(26,26,36,0.95))]">
        {pin.users.profile_photo ? (
          <Image src={pin.users.profile_photo} alt={pin.users.name} width={480} height={180} className="h-full w-full object-cover opacity-95" />
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-[#F0F0F5]">{pin.users.name}</div>
            <div className="text-sm text-[#9CA3AF]">@{pin.users.username}</div>
          </div>
          <span className="rounded-full bg-[#10B981]/15 px-3 py-1 text-xs font-semibold text-[#10B981]">Verified owner</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{pin.users.bio || 'A structured recommendation card attached to this board.'}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-[#9CA3AF]">
          <span>{Math.max(16, pin.users.pin_count || 0)} saves</span>
          <span>{Math.max(8, Math.floor((pin.users.view_count || 0) / 10))} clicks</span>
        </div>
      </div>
    </article>
  );
}

function SignalCard({ title, value, description, icon }: { title: string; value: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">{icon}</div>
      <div className="mt-3 text-2xl font-semibold text-[#F0F0F5]">{value}</div>
      <div className="mt-1 text-sm font-medium text-[#F0F0F5]">{title}</div>
      <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">{description}</p>
    </div>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#12121A] px-4 py-2 text-sm text-[#9CA3AF]">
      <span className="text-[#D4AF37]">{icon}</span>
      <strong className="text-[#F0F0F5]">{value}</strong>
      <span>{label}</span>
    </span>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/15 bg-[#0A0A0F] p-6">
      <div className="text-lg font-semibold text-[#F0F0F5]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{text}</p>
    </div>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050508]/80 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#12121A] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.03] p-2 text-[#9CA3AF]">
          <FiX className="h-5 w-5" />
        </button>
        <div className="mb-4 pr-10">
          <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Identify</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}