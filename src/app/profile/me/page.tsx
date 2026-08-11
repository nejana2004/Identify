"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';
import CreateBoardModal from '@/components/CreateBoardModal';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { FiBarChart2, FiBookmark, FiEye, FiLayers, FiLogOut, FiMessageSquare, FiMousePointer, FiPlus, FiSettings, FiUser } from 'react-icons/fi';

type ProfileSummary = {
  id: string;
  name: string | null;
  username: string | null;
  email?: string | null;
};

type BoardSummary = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  slug: string | null;
  created_at: string;
};

type ThreadSummary = {
  id: string;
  board_id: string;
  title: string;
  body: string;
  save_count: number;
  view_count: number;
  click_count: number;
  upvote_count: number;
  downvote_count: number;
  created_at: string;
};

type CardSummary = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  external_link: string | null;
  save_count: number;
  click_count: number;
  created_at: string;
  thread_id: string | null;
};

type NotificationSummary = {
  id: string;
  title: string;
  message: string | null;
  created_at: string;
  is_read: boolean;
};

export default function MyProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [inventory, setInventory] = useState<CardSummary[]>([]);
  const [savedBoards, setSavedBoards] = useState<BoardSummary[]>([]);
  const [savedThreads, setSavedThreads] = useState<ThreadSummary[]>([]);
  const [savedCards, setSavedCards] = useState<CardSummary[]>([]);
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadMe() {
      setLoading(true);
      setError(null);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          router.push('/auth/login');
          return;
        }

        const [profileRes, boardsRes, threadsRes, inventoryRes, notificationsRes, followedBoardsRes] = await Promise.all([
          supabase.from('users').select('id, name, username, email').eq('id', user.id).maybeSingle(),
          supabase.from('boards').select('id, title, description, is_public, slug, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('threads').select('id, board_id, title, body, save_count, view_count, click_count, created_at').eq('author_id', user.id).order('created_at', { ascending: false }),
          supabase.from('product_cards').select('id, name, description, category, external_link, save_count, click_count, created_at, thread_id').eq('creator_id', user.id).is('thread_id', null).order('created_at', { ascending: false }),
          supabase.from('notifications').select('id, title, message, created_at, is_read').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
          supabase.from('board_followers').select('board_id').eq('user_id', user.id),
        ]);

        setProfile((profileRes.data || { id: user.id, name: null, username: user.email?.split('@')[0] || 'user', email: user.email }) as ProfileSummary);
        setBoards((boardsRes.data || []) as BoardSummary[]);
        setThreads(((threadsRes.data || []) as any[]).map((thread) => ({ ...thread, upvote_count: thread.upvote_count || 0, downvote_count: thread.downvote_count || 0 })) as ThreadSummary[]);
        setInventory((inventoryRes.data || []) as CardSummary[]);
        setNotifications((notificationsRes.data || []) as NotificationSummary[]);

        const followedBoardIds = (followedBoardsRes.data || []).map((item) => item.board_id);
        if (followedBoardIds.length > 0) {
          const { data } = await supabase.from('boards').select('id, title, description, is_public, slug, created_at').in('id', followedBoardIds).order('created_at', { ascending: false });
          setSavedBoards((data || []) as BoardSummary[]);
        } else {
          setSavedBoards([]);
        }

        try {
          const { data: saves } = await supabase.from('content_saves').select('target_type, target_id').eq('user_id', user.id);
          const threadIds = (saves || []).filter((item: any) => item.target_type === 'thread').map((item: any) => item.target_id);
          const cardIds = (saves || []).filter((item: any) => item.target_type === 'card').map((item: any) => item.target_id);

          if (threadIds.length > 0) {
            const { data } = await supabase.from('threads').select('id, board_id, title, body, save_count, view_count, click_count, created_at').in('id', threadIds);
            setSavedThreads(((data || []) as any[]).map((thread) => ({ ...thread, upvote_count: thread.upvote_count || 0, downvote_count: thread.downvote_count || 0 })) as ThreadSummary[]);
          } else {
            setSavedThreads([]);
          }

          if (cardIds.length > 0) {
            const { data } = await supabase.from('product_cards').select('id, name, description, category, external_link, save_count, click_count, created_at, thread_id').in('id', cardIds);
            setSavedCards((data || []) as CardSummary[]);
          } else {
            setSavedCards([]);
          }
        } catch {
          setSavedThreads([]);
          setSavedCards([]);
        }
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load account.');
      } finally {
        setLoading(false);
      }
    }

    loadMe();
  }, [router]);

  const metrics = useMemo(() => ({
    boards: boards.length,
    threads: threads.length,
    cards: inventory.length,
    views: threads.reduce((sum, thread) => sum + (thread.view_count || 0), 0),
    clicks: threads.reduce((sum, thread) => sum + (thread.click_count || 0), 0) + inventory.reduce((sum, card) => sum + (card.click_count || 0), 0),
    saves: threads.reduce((sum, thread) => sum + (thread.save_count || 0), 0) + inventory.reduce((sum, card) => sum + (card.save_count || 0), 0),
  }), [boards, threads, inventory]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push('/');
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[240px_1fr_320px]">
        <aside className="space-y-2">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#6B7280]">Account</div>
          <NavItem href="/me" active icon={<FiBarChart2 className="h-4 w-4" />} label="Overview" />
          <NavItem href="/boards" icon={<FiLayers className="h-4 w-4" />} label="Boards" />
          <NavItem href="/keys" icon={<FiBookmark className="h-4 w-4" />} label="Inventory" />
          <NavItem href="/notifications" icon={<FiEye className="h-4 w-4" />} label="Notifications" badge={unreadCount > 0 ? String(unreadCount) : undefined} />
          <NavItem href="/settings/profile" icon={<FiSettings className="h-4 w-4" />} label="Settings" />
          {profile?.username ? <NavItem href={`/profile/${encodeURIComponent(profile.username)}`} icon={<FiUser className="h-4 w-4" />} label="Public profile" /> : null}
        </aside>

        <main className="space-y-5">
          <section className="rounded-[16px] border border-white/10 bg-[#121212] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm text-[#9CA3AF]">Signed in as</div>
                <h1 className="mt-1 text-3xl font-semibold text-[#F0F0F5]">{loading ? 'Loading...' : profile?.name || profile?.username || 'Account'}</h1>
                <div className="mt-1 text-sm text-[#6B7280]">{profile?.email || `@${profile?.username || 'user'}`}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowCreateBoardModal(true)} className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black">Create board</button>
                <Link href="/keys/inventory/new" className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]">Add card</Link>
                <button onClick={handleSignOut} disabled={signingOut} className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-60">
                  <FiLogOut className="h-4 w-4" /> {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </div>
          </section>

          {error ? <div className="rounded-[12px] border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

          <section className="grid gap-3 md:grid-cols-4">
            <MetricCard icon={<FiLayers className="h-4 w-4" />} label="Boards" value={String(metrics.boards)} />
            <MetricCard icon={<FiMessageSquare className="h-4 w-4" />} label="Threads" value={String(metrics.threads)} />
            <MetricCard icon={<FiEye className="h-4 w-4" />} label="Views" value={String(metrics.views)} />
            <MetricCard icon={<FiMousePointer className="h-4 w-4" />} label="Clicks" value={String(metrics.clicks)} />
          </section>

          <Section title="Saved boards">
            {savedBoards.length === 0 ? <EmptyRow text="No saved boards yet." /> : savedBoards.map((board) => (
              <ItemRow key={board.id} title={board.title} subtitle={board.description || 'Board'} href={`/b/${board.slug || slugify(board.title)}`} meta={board.is_public ? 'Public' : 'Private'} />
            ))}
          </Section>

          <Section title="Saved threads">
            {savedThreads.length === 0 ? <EmptyRow text="No saved threads yet." /> : savedThreads.map((thread) => (
              <ItemRow key={thread.id} title={thread.title} subtitle={thread.body} href="/search?filter=threads" meta={`${thread.save_count} saves`} />
            ))}
          </Section>

          <Section title="Saved cards">
            {savedCards.length === 0 ? <EmptyRow text="No saved cards yet." /> : savedCards.map((card) => (
              <ItemRow key={card.id} title={card.name} subtitle={card.description || 'Saved recommendation'} href={card.external_link || '/search?filter=cards'} meta={`${card.save_count} saves · ${card.click_count} clicks`} external={!!card.external_link} />
            ))}
          </Section>

          <Section title="Your boards">
            {boards.length === 0 ? <EmptyRow text="No boards created yet." /> : boards.map((board) => (
              <ItemRow key={board.id} title={board.title} subtitle={board.description || 'No description yet.'} href={`/b/${board.slug || slugify(board.title)}`} meta={board.is_public ? 'Public' : 'Private'} actionHref={`/boards/${board.id}/edit`} actionLabel="Manage" />
            ))}
          </Section>
        </main>

        <aside className="space-y-4">
          <Section title="Signals" compact>
            <StatRow label="Views" value={String(metrics.views)} />
            <StatRow label="Clicks" value={String(metrics.clicks)} />
            <StatRow label="Saves" value={String(metrics.saves)} />
            <StatRow label="Cards" value={String(metrics.cards)} />
          </Section>

          <Section title="Recent activity" compact>
            {notifications.length === 0 ? <EmptyRow text="No recent activity yet." /> : notifications.map((notification) => (
              <div key={notification.id} className="rounded-[12px] border border-white/10 bg-[#171717] p-3">
                <div className="text-sm text-[#F0F0F5]">{notification.title}</div>
                <div className="mt-1 text-xs text-[#8D8D8D]">{notification.message || 'New account activity'}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#6B7280]">{formatTime(notification.created_at)}</div>
              </div>
            ))}
          </Section>
        </aside>
      </div>

      <CreateBoardModal open={showCreateBoardModal} onClose={() => setShowCreateBoardModal(false)} />
    </div>
  );
}

function NavItem({ href, label, icon, active = false, badge }: { href: string; label: string; icon: React.ReactNode; active?: boolean; badge?: string }) {
  return (
    <Link href={href} className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${active ? 'bg-[#12121A] text-[#F0F0F5]' : 'text-[#9CA3AF] hover:bg-[#12121A] hover:text-[#F0F0F5]'}`}>
      <span className="flex items-center gap-2">{icon}{label}</span>
      {badge ? <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-1 text-[10px] font-semibold text-[#D4AF37]">{badge}</span> : null}
    </Link>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-[#0B0B0B] p-4">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]">{icon}</div>
      <div className="mt-3 text-3xl font-semibold text-[#F0F0F5]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">{label}</div>
    </div>
  );
}

function Section({ title, children, compact = false }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section className={`rounded-[16px] border border-white/10 bg-[#121212] ${compact ? 'p-4' : 'p-5'}`}>
      <div className="mb-3 text-lg font-semibold text-[#F0F0F5]">{title}</div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function ItemRow({ title, subtitle, href, meta, actionHref, actionLabel, external = false }: { title: string; subtitle: string; href: string; meta: string; actionHref?: string; actionLabel?: string; external?: boolean }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-[#0B0B0B] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={href} target={external ? '_blank' : undefined} className="text-base font-semibold text-[#F0F0F5] hover:text-[#D4AF37]">{title}</Link>
          <div className="mt-1 text-sm text-[#8D8D8D]">{subtitle}</div>
          <div className="mt-2 text-xs text-[#6B7280]">{meta}</div>
        </div>
        {actionHref && actionLabel ? <Link href={actionHref} className="rounded-full border border-white/10 bg-[#171717] px-3 py-1.5 text-xs text-[#D7D7D7]">{actionLabel}</Link> : null}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0"><span className="text-[#9CA3AF]">{label}</span><span className="font-semibold text-[#F0F0F5]">{value}</span></div>;
}

function EmptyRow({ text }: { text: string }) {
  return <div className="rounded-[12px] border border-white/10 bg-[#0B0B0B] p-4 text-sm text-[#9CA3AF]">{text}</div>;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
