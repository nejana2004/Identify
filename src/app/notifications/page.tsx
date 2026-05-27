"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FiEye, FiMapPin, FiMail, FiUserPlus, FiCheck, FiX, FiBell, FiTrash2, FiHeart } from 'react-icons/fi';

interface Notification {
  id: string;
  type: 'profile_view' | 'pin' | 'board_invite' | 'join_request' | 'invite_accepted' | 'request_approved' | 'board_follow';
  title: string;
  message: string | null;
  from_user_id: string | null;
  board_id: string | null;
  is_read: boolean;
  created_at: string;
  from_user?: {
    id: string;
    username: string;
    name: string;
    profile_photo: string | null;
  };
  board?: {
    id: string;
    title: string;
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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

        console.log('Loading notifications for user:', user.id);

        // Load notifications - first try without joins to see raw data
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (filter === 'unread') {
          query = query.eq('is_read', false);
        }

        const { data: rawNotifications, error: rawError } = await query.limit(50);
        
        console.log('Raw notifications:', rawNotifications, rawError);

        if (rawError) {
          console.error('Error loading notifications:', rawError);
          setNotifications([]);
          return;
        }

        // Now load related data for each notification
        const notificationsWithData = await Promise.all(
          (rawNotifications || []).map(async (notif) => {
            let from_user = null;
            let board = null;

            if (notif.from_user_id) {
              const { data } = await supabase
                .from('users')
                .select('id, username, name, profile_photo')
                .eq('id', notif.from_user_id)
                .single();
              from_user = data;
            }

            if (notif.board_id) {
              const { data } = await supabase
                .from('boards')
                .select('id, title')
                .eq('id', notif.board_id)
                .single();
              board = data;
            }

            return { ...notif, from_user, board };
          })
        );

        console.log('Notifications with data:', notificationsWithData);
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
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const handleJoinRequest = async (notification: Notification, approve: boolean) => {
    console.log('handleJoinRequest called:', { notification, approve });
    
    if (!notification.from_user_id || !notification.board_id) {
      console.log('Missing from_user_id or board_id!');
      return;
    }
    
    setProcessingRequest(notification.id);
    try {
      const requestBody = {
        action: 'respond_request',
        boardId: notification.board_id,
        requesterId: notification.from_user_id,
        approved: approve,
        ownerId: user?.id
      };
      console.log('Sending request:', requestBody);
      
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('Response:', data);
      
      if (data.success) {
        console.log('Success! Removing notification from UI');
        // Remove this notification
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        // Delete the notification from DB
        await supabase.from('notifications').delete().eq('id', notification.id);
      } else {
        console.log('Failed:', data.error);
        alert(data.error || 'Failed to process request');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Something went wrong');
    } finally {
      setProcessingRequest(null);
    }
  };

  const clearAllNotifications = async () => {
    if (!user || !confirm('Are you sure you want to clear all notifications?')) return;
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setNotifications([]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'profile_view':
        return <FiEye className="w-5 h-5 text-blue-500" />;
      case 'pin':
        return <FiMapPin className="w-5 h-5 text-red-500" />;
      case 'board_invite':
        return <FiMail className="w-5 h-5 text-purple-500" />;
      case 'join_request':
        return <FiUserPlus className="w-5 h-5 text-orange-500" />;
      case 'board_follow':
        return <FiHeart className="w-5 h-5 text-pink-500" />;
      case 'invite_accepted':
      case 'request_approved':
        return <FiCheck className="w-5 h-5 text-green-500" />;
      default:
        return <FiBell className="w-5 h-5 text-gray-500" />;
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-gray-600">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark all read
            </button>
            <button
              onClick={clearAllNotifications}
              disabled={notifications.length === 0}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <FiBell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">
              {filter === 'unread' 
                ? "You're all caught up!" 
                : "When someone views your profile or pins you, you'll see it here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${
                  !notification.is_read ? 'border-l-4 border-blue-500' : ''
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon or User Photo */}
                  <div className="flex-shrink-0">
                    {notification.from_user?.profile_photo ? (
                      <Link href={`/profile/${notification.from_user.username}`}>
                        <div className="w-12 h-12 rounded-full overflow-hidden relative">
                          <Image
                            src={notification.from_user.profile_photo}
                            alt={notification.from_user.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </Link>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        {getIcon(notification.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{notification.title}</p>
                    {notification.message && (
                      <p className="text-gray-600 text-sm mt-1">{notification.message}</p>
                    )}
                    
                    {/* Accept/Reject buttons for join requests */}
                    {notification.type === 'join_request' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinRequest(notification, true);
                          }}
                          disabled={processingRequest === notification.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <FiCheck className="w-4 h-4" />
                          {processingRequest === notification.id ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinRequest(notification, false);
                          }}
                          disabled={processingRequest === notification.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 disabled:opacity-50"
                        >
                          <FiX className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">{formatTime(notification.created_at)}</span>
                      {notification.from_user && (
                        <Link 
                          href={`/profile/${notification.from_user.username}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View profile
                        </Link>
                      )}
                      {notification.board && (
                        <Link 
                          href={`/boards/${notification.board.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View board
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
