"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { FiBell, FiCheck, FiEye, FiHeart, FiMail, FiMapPin, FiTrash2, FiUserPlus } from 'react-icons/fi';

interface Notification {
  id: string;
  type: 'profile_view' | 'pin' | 'board_invite' | 'join_request' | 'invite_accepted' | 'request_approved' | 'board_follow' | 'thread_created' | 'reply_created' | 'card_attached' | 'request_rejected';
  title: string;
  message: string | null;
  from_user_id: string | null;
  board_id: string | null;
  thread_id?: string | null;
  product_card_id?: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: { id: string; username: string; name: string; profile_photo: string | null };
  board?: { id: string; title: string; slug?: string | null };
  thread?: { id: string; title: string } | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        setUser(user);

        let query = supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (filter === 'unread') query = query.eq('is_read', false);

        const { data: rawNotifications, error } = await query.limit(50);
        if (error) {
          console.error('Error loading notifications:', error);
          setNotifications([]);
          return;
        }

        const notificationsWithData = await Promise.all((rawNotifications || []).map(async (notif) => {
          let from_user = null;
          let board = null;
          let thread = null;

          if (notif.from_user_id) {
            const { data } = await supabase.from('users').select('id, username, name, profile_photo').eq('id', notif.from_user_id).single();
            from_user = data;
          }

          if (notif.board_id) {
            const { data } = await supabase.from('boards').select('id, title, slug').eq('id', notif.board_id).single();
            board = data;
          }

          if (notif.thread_id) {
            const { data } = await supabase.from('threads').select('id, title').eq('id', notif.thread_id).maybeSingle();
            thread = data;
          }

          return { ...notif, from_user, board, thread };
        }));

        setNotifications(notificationsWithData);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [router, filter]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    if (!error) setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    if (!error) setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (!error) setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const clearAllNotifications = async () => {
    if (!user || !confirm('Are you sure you want to clear all notifications?')) return;
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    if (!error) setNotifications([]);
  };

  const handleJoinRequest = async (notification: Notification, approve: boolean) => {
    if (!notification.from_user_id || !notification.board_id) return;
    setProcessingRequest(notification.id);
    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_request',
          boardId: notification.board_id,
          requesterId: notification.from_user_id,
          approved: approve,
          ownerId: user?.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
        await supabase.from('notifications').delete().eq('id', notification.id);
      } else {
        alert(data.error || 'Failed to process request');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Something went wrong');
    } finally {
      setProcessingRequest(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'profile_view': return <FiEye className="h-5 w-5 text-[#60A5FA]" />;
      case 'pin': return <FiMapPin className="h-5 w-5 text-[#F87171]" />;
      case 'board_invite': return <FiMail className="h-5 w-5 text-[#A78BFA]" />;
      case 'join_request': return <FiUserPlus className="h-5 w-5 text-[#FBBF24]" />;
      case 'board_follow': return <FiHeart className="h-5 w-5 text-[#F472B6]" />;
      case 'thread_created': return <FiBell className="h-5 w-5 text-[#60A5FA]" />;
      case 'reply_created': return <FiCheck className="h-5 w-5 text-[#34D399]" />;
      case 'card_attached': return <FiMapPin className="h-5 w-5 text-[#FBBF24]" />;
      case 'request_rejected': return <FiTrash2 className="h-5 w-5 text-[#F87171]" />;
      case 'invite_accepted':
      case 'request_approved': return <FiCheck className="h-5 w-5 text-[#34D399]" />;
      default: return <FiBell className="h-5 w-5 text-[#9CA3AF]" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const notificationHref = (notification: Notification) => {
    if (notification.thread && notification.board) {
      return `/b/${notification.board.slug || slugify(notification.board.title)}/t/${slugify(notification.thread.title)}`;
    }
    if (notification.board) {
      return `/b/${notification.board.slug || slugify(notification.board.title)}`;
    }
    if (notification.from_user?.username) {
      return `/profile/${encodeURIComponent(notification.from_user.username)}`;
    }
    return '/notifications';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#050508]"><div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#D4AF37]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#050508]">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Notifications</div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#F0F0F5]">Requests, invites, follows, and trust activity</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#9CA3AF]">Board creators see join requests here. Members see invitations, approvals, replies, and card-related activity.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={markAllAsRead} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]">Mark all read</button>
              <button onClick={clearAllNotifications} className="rounded-2xl bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">Clear all</button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-full border border-white/10 bg-[#0A0A0F] p-2 text-sm text-[#9CA3AF]">
            <button onClick={() => setFilter('all')} className={`rounded-full px-4 py-2 ${filter === 'all' ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'text-[#9CA3AF]'}`}>All</button>
            <button onClick={() => setFilter('unread')} className={`rounded-full px-4 py-2 ${filter === 'unread' ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'text-[#9CA3AF]'}`}>Unread</button>
            <div className="ml-auto rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#D4AF37]">{unreadCount} unread</div>
          </div>

          <div className="mt-6 space-y-3">
            {notifications.length === 0 ? (
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-8 text-center text-[#9CA3AF]">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={`rounded-[28px] border p-4 ${notification.is_read ? 'border-white/10 bg-black/20' : 'border-[#D4AF37]/20 bg-[#D4AF37]/10'}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-[#F0F0F5]">{notification.title}</div>
                        {notification.board && <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-[#9CA3AF]">{notification.board.title}</span>}
                      </div>
                      {notification.message && <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">{notification.message}</p>}
                      <div className="mt-2 flex items-center gap-3 text-xs text-[#6B7280]"><span>{formatTime(notification.created_at)}</span>{notification.from_user && <span>From {notification.from_user.name || notification.from_user.username}</span>}</div>
                      <Link href={notificationHref(notification)} className="mt-3 inline-flex text-xs text-[#D4AF37] hover:text-[#F0C94A]">Open</Link>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && <button onClick={() => markAsRead(notification.id)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#F0F0F5]">Read</button>}
                      <button onClick={() => deleteNotification(notification.id)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#F0F0F5]">Delete</button>
                    </div>
                  </div>

                  {notification.type === 'join_request' && notification.from_user_id && notification.board_id && (
                    <div className="mt-4 flex gap-3">
                      <button disabled={processingRequest === notification.id} onClick={() => handleJoinRequest(notification, true)} className="rounded-2xl bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">Approve</button>
                      <button disabled={processingRequest === notification.id} onClick={() => handleJoinRequest(notification, false)} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]">Decline</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
