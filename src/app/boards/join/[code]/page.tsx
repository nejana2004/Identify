"use client";

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiGrid, FiUser, FiCheck, FiX } from 'react-icons/fi';

interface BoardInvite {
  id: string;
  board: {
    id: string;
    title: string;
    description: string | null;
    cover_image: string | null;
    user: {
      name: string;
      username: string;
      profile_photo: string | null;
    };
  };
  expires_at: string;
}

export default function JoinBoardPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { code } = resolvedParams;
  
  const [invite, setInvite] = useState<BoardInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        // Check auth
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Fetch invite details
        const response = await fetch(`/api/boards/invite?code=${code}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Invalid invite link');
        } else {
          setInvite(data.invite);
        }
      } catch (err) {
        setError('Failed to load invite');
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [code]);

  const [requestPending, setRequestPending] = useState(false);

  const handleJoin = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=/boards/join/${code}`);
      return;
    }

    console.log('Submitting join request:', { code, userId: user.id });

    setJoining(true);
    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_invite',
          inviteCode: code,
          userId: user.id
        })
      });

      const data = await response.json();
      
      console.log('API Response:', data);

      if (data.success) {
        if (data.pending) {
          // Request sent, waiting for approval
          console.log('Request is pending, showing pending UI');
          setRequestPending(true);
        } else {
          // Already a member or owner, redirect directly
          console.log('Not pending, redirecting. Message:', data.message);
          setSuccess(true);
          setTimeout(() => {
            router.push(`/boards/${data.boardId}`);
          }, 2000);
        }
      } else {
        console.log('Request failed:', data.error);
        setError(data.error || 'Failed to join board');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiX className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/explore"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Explore Boards
          </Link>
        </div>
      </div>
    );
  }

  if (requestPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h1>
          <p className="text-gray-600 mb-4">Your request to join "{invite?.board.title}" has been sent to the board owner.</p>
          <p className="text-sm text-gray-500 mb-6">You'll be notified when they respond.</p>
          <Link
            href="/explore"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue Exploring
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiCheck className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">You're In!</h1>
          <p className="text-gray-600 mb-4">Successfully joined the board</p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg">
        {/* Board Preview */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4 overflow-hidden">
            {invite?.board.cover_image ? (
              <Image
                src={invite.board.cover_image}
                alt={invite.board.title}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <FiGrid className="w-10 h-10 text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">You're invited to join</h1>
          <h2 className="text-2xl font-bold text-blue-600 mb-2">"{invite?.board.title}"</h2>
          {invite?.board.description && (
            <p className="text-gray-600 text-sm">{invite.board.description}</p>
          )}
        </div>

        {/* Inviter Info */}
        <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
            {invite?.board.user.profile_photo ? (
              <Image
                src={invite.board.user.profile_photo}
                alt={invite.board.user.name}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <FiUser className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">Invited by</p>
            <p className="font-medium text-gray-900">{invite?.board.user.name}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {joining ? 'Joining...' : user ? 'Join Board' : 'Sign in to Join'}
          </button>
          <Link
            href="/explore"
            className="block w-full text-center py-3 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Maybe later
          </Link>
        </div>

        {/* Expiry Notice */}
        <p className="text-xs text-gray-400 text-center mt-6">
          This invite expires on {new Date(invite?.expires_at || '').toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
