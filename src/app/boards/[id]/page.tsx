"use client";

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiUsers, FiUserPlus, FiCopy, FiCheck, FiX, FiHeart, FiBookmark } from 'react-icons/fi';

interface Curator {
  id: string;
  username: string;
  name: string;
  profile_photo: string | null;
  bio: string | null;
}

interface Board {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
  cover_image?: string | null;
  users: {
    id: string;
    username: string;
    name: string;
  };
}

interface Pin {
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
    pin_count: number;
    view_count: number;
  };
}

interface BoardMember {
  id: string;
  user_id: string;
  role: string;
  users: {
    name: string;
    username: string;
    profile_photo: string | null;
  };
}

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [pinToRemove, setPinToRemove] = useState<Pin | null>(null);
  const [removing, setRemoving] = useState(false);
  
  // Invite/Request state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [requestingJoin, setRequestingJoin] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [leavingBoard, setLeavingBoard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState(false);
  
  // Curator & Following state
  const [curator, setCurator] = useState<Curator | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/boards/${resolvedParams.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateInviteLink = async () => {
    if (!user || !board) return;
    
    setGeneratingInvite(true);
    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_invite',
          boardId: board.id,
          inviterId: user.id
        })
      });

      const data = await response.json();
      if (data.success) {
        setInviteLink(`${window.location.origin}/boards/join/${data.inviteCode}`);
        setShowInviteModal(true);
      } else {
        alert(data.error || 'Failed to create invite link');
      }
    } catch (err) {
      alert('Failed to create invite link');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  const requestToJoin = async () => {
    if (!user || !board) return;
    
    setRequestingJoin(true);
    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_join',
          boardId: board.id,
          userId: user.id
        })
      });

      const data = await response.json();
      if (data.success) {
        setHasRequested(true);
        setJoinSuccess(true);
      } else {
        setShowJoinModal(false);
        alert(data.error || 'Failed to send request');
      }
    } catch (err) {
      setShowJoinModal(false);
      alert('Failed to send request');
    } finally {
      setRequestingJoin(false);
    }
  };

  const confirmLeaveBoard = async () => {
    if (!user || !board) return;
    
    setLeavingBoard(true);
    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave_board',
          boardId: board.id,
          userId: user.id
        })
      });

      const data = await response.json();
      if (data.success) {
        setIsPinned(false);
        setIsMember(false);
        // Refresh pins to remove self
        setPins(prev => prev.filter(p => p.profile_id !== user.id));
        setLeaveSuccess(true);
      } else {
        setShowLeaveModal(false);
        alert(data.error || 'Failed to leave board');
      }
    } catch (err) {
      setShowLeaveModal(false);
      alert('Failed to leave board');
    } finally {
      setLeavingBoard(false);
    }
  };

  const toggleFollow = async () => {
    if (!user || !board) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('board_followers')
          .delete()
          .eq('board_id', board.id)
          .eq('user_id', user.id);
        
        if (!error) {
          setIsFollowing(false);
          setFollowerCount(prev => Math.max(0, prev - 1));
        }
      } else {
        // Follow
        const { error } = await supabase
          .from('board_followers')
          .insert({
            board_id: board.id,
            user_id: user.id
          });
        
        if (!error) {
          setIsFollowing(true);
          setFollowerCount(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!board) return;
    
    console.log('Loading members for board:', board.id);
    
    const { data: membersData, error: membersError } = await supabase
      .from('board_members')
      .select(`
        id, user_id, role,
        users:user_id (name, username, profile_photo)
      `)
      .eq('board_id', board.id);

    console.log('Members loaded:', { membersData, membersError });

    if (membersData) {
      // Filter out owner (they're shown separately)
      const nonOwnerMembers = membersData.filter((m: any) => m.user_id !== board.user_id);
      setMembers(nonOwnerMembers as unknown as BoardMember[]);
      setShowMembersModal(true);
    } else {
      setMembers([]);
      setShowMembersModal(true);
    }
  };

  useEffect(() => {
    async function loadBoardData() {
      setLoading(true);
      
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Load board details
        console.log('Loading board with ID:', resolvedParams.id);
        const { data: boardData, error: boardError } = await supabase
          .from('boards')
          .select(`
            id, title, description, is_public, created_at, user_id, cover_image
          `)
          .eq('id', resolvedParams.id)
          .single();

        console.log('Board query result:', { boardData, boardError });
        if (boardError) {
          console.log('Board error details:', {
            code: boardError.code,
            message: boardError.message,
            details: boardError.details,
            hint: boardError.hint
          });
          throw boardError;
        }

        // Load user information separately
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, username, name')
          .eq('id', boardData.user_id)
          .single();

        if (userError) {
          console.log('User query error:', userError);
          // Continue without user data if not found
        }

        // Combine board and user data
        const completeBoard = {
          ...boardData,
          users: userData || { id: boardData.user_id, username: 'Unknown', name: 'Unknown User' }
        };
        
        // Check if board is public or if user is the owner
        if (!completeBoard.is_public && (!user || user.id !== completeBoard.user_id)) {
          router.push('/boards');
          return;
        }

        setBoard(completeBoard);
        const userIsOwner = user?.id === completeBoard.user_id;
        setIsOwner(userIsOwner);

        // Load curator (board owner) profile with full details
        const { data: curatorData } = await supabase
          .from('users')
          .select('id, username, name, profile_photo, bio')
          .eq('id', boardData.user_id)
          .single();
        
        if (curatorData) {
          setCurator(curatorData);
        }

        // Load follower count
        const { count: followersCount } = await supabase
          .from('board_followers')
          .select('*', { count: 'exact', head: true })
          .eq('board_id', resolvedParams.id);
        
        setFollowerCount(followersCount || 0);

        // Check if current user is following this board
        if (user) {
          const { data: followData } = await supabase
            .from('board_followers')
            .select('id')
            .eq('board_id', resolvedParams.id)
            .eq('user_id', user.id)
            .maybeSingle();
          
          setIsFollowing(!!followData);
        }

        // Check if user is a member of this board
        if (user && !userIsOwner) {
          try {
            const { data: memberData, error: memberError } = await supabase
              .from('board_members')
              .select('id')
              .eq('board_id', resolvedParams.id)
              .eq('user_id', user.id)
              .maybeSingle();
            
            console.log('Member check:', { memberData, memberError, userId: user.id });
            setIsMember(!!memberData);
          } catch (e) {
            // Ignore RLS errors
            console.log('Member check failed (RLS)', e);
          }

          try {
            // Check if user has already requested to join
            const { data: requestData } = await supabase
              .from('board_join_requests')
              .select('id')
              .eq('board_id', resolvedParams.id)
              .eq('user_id', user.id)
              .eq('status', 'pending')
              .maybeSingle();
            
            setHasRequested(!!requestData);
          } catch (e) {
            // Ignore RLS errors
            console.log('Request check failed (RLS)');
          }

          try {
            // Check if user is pinned to this board
            const { data: pinData } = await supabase
              .from('pins')
              .select('id')
              .eq('board_id', resolvedParams.id)
              .eq('profile_id', user.id)
              .maybeSingle();
            
            setIsPinned(!!pinData);
          } catch (e) {
            console.log('Pin check failed (RLS)');
          }
        }

        // Load pins for this board (without user join for now)
        const { data: pinsData, error: pinsError } = await supabase
          .from('pins')
          .select(`
            id, board_id, profile_id, created_at
          `)
          .eq('board_id', resolvedParams.id)
          .order('created_at', { ascending: false });

        if (pinsError) {
          console.log('Pins error details:', {
            code: pinsError.code,
            message: pinsError.message,
            details: pinsError.details
          });
          throw pinsError;
        }

        // Load user data for each pin separately
        const pinsWithUsers = await Promise.all(
          (pinsData || []).map(async (pin) => {
            const { data: pinUserData } = await supabase
              .from('users')
              .select('id, username, name, profile_photo, bio, pin_count, view_count')
              .eq('id', pin.profile_id)
              .single();
            
            return {
              ...pin,
              users: pinUserData || {
                id: pin.profile_id,
                username: 'Unknown',
                name: 'Unknown User',
                profile_photo: null,
                bio: null,
                pin_count: 0,
                view_count: 0
              }
            };
          })
        );

        setPins(pinsWithUsers);
      } catch (error: any) {
        console.error('Error loading board:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          boardId: resolvedParams.id,
          userAuthenticated: !!user,
          errorType: typeof error,
          errorString: String(error),
          errorCode: error?.code,
          errorMessage: error?.message,
          errorDetails: error?.details
        });
        
        // More specific error handling
        if (error?.code === 'PGRST116') {
          console.error('Board not found - 404 error');
        } else if (error?.message?.includes('JWT')) {
          console.error('Authentication error');
        } else if (error?.message?.includes('permission')) {
          console.error('Permission denied error');
        }
        
        // Don't redirect immediately, let user see the error
        // router.push('/boards');
      } finally {
        setLoading(false);
      }
    }

    loadBoardData();
  }, [resolvedParams.id, router]);

  const handleRemovePin = async (pinId: string) => {
    if (!isOwner) return;
    
    setRemoving(true);

    try {
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId);

      if (error) throw error;

      setPins(pins.filter(pin => pin.id !== pinId));
      setShowRemoveModal(false);
      setPinToRemove(null);
    } catch (error) {
      console.error('Error removing pin:', error);
      alert('Failed to remove pin');
    } finally {
      setRemoving(false);
    }
  };

  const openRemoveModal = (pin: Pin) => {
    setPinToRemove(pin);
    setShowRemoveModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Board not found</h1>
          <Link href="/boards" className="text-blue-600 hover:underline">
            ← Back to Boards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Board Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
            <Link href="/boards" className="text-blue-600 hover:underline flex items-center text-sm sm:text-base">
              ← Back to Boards
            </Link>
            <div className="flex space-x-2 flex-wrap gap-2">
              {/* Members Button - Only for owner */}
              {isOwner && (
                <button
                  onClick={loadMembers}
                  className="bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 rounded-md hover:bg-gray-200 flex items-center gap-2 transition-colors text-sm sm:text-base"
                >
                  <FiUsers className="w-4 h-4" />
                  <span className="hidden sm:inline">Members</span>
                </button>
              )}
              
              {/* Join Board Button - For non-members/non-pinned users */}
              {!isOwner && !isPinned && user && (
                <button
                  onClick={() => setShowJoinModal(true)}
                  disabled={requestingJoin || hasRequested}
                  className={`px-3 sm:px-4 py-2 rounded-md flex items-center gap-2 transition-colors text-sm sm:text-base disabled:opacity-50 ${
                    hasRequested 
                      ? 'bg-gray-100 text-gray-500' 
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  <FiUserPlus className="w-4 h-4" />
                  {hasRequested ? 'Request Sent' : 'Join Board'}
                </button>
              )}

              {/* Leave Board Button - For pinned users (not owner) */}
              {!isOwner && isPinned && user && (
                <button
                  onClick={() => setShowLeaveModal(true)}
                  disabled={leavingBoard}
                  className="bg-red-100 text-red-700 px-3 sm:px-4 py-2 rounded-md hover:bg-red-200 flex items-center gap-2 transition-colors text-sm sm:text-base disabled:opacity-50"
                >
                  <FiX className="w-4 h-4" />
                  <span>Leave Board</span>
                </button>
              )}
              
              {/* Invite Button - For owner only */}
              {isOwner && (
                <button
                  onClick={generateInviteLink}
                  disabled={generatingInvite}
                  className="bg-green-100 text-green-700 px-3 sm:px-4 py-2 rounded-md hover:bg-green-200 flex items-center gap-2 transition-colors text-sm sm:text-base disabled:opacity-50"
                >
                  <FiUserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">{generatingInvite ? 'Creating...' : 'Invite'}</span>
                </button>
              )}
              
              {/* Share Button - Always visible for public boards */}
              {board.is_public && (
                <button
                  onClick={handleShare}
                  className="bg-blue-100 text-blue-700 px-3 sm:px-4 py-2 rounded-md hover:bg-blue-200 flex items-center gap-2 transition-colors text-sm sm:text-base"
                >
                  {copied ? (
                    <>✓ Copied!</>
                  ) : (
                    <>🔗 Share</>  
                  )}
                </button>
              )}
              {isOwner && (
                <Link
                  href={`/boards/${board.id}/edit`}
                  className="bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 rounded-md hover:bg-gray-300 text-sm sm:text-base"
                >
                  Edit Board
                </Link>
              )}
            </div>
          </div>

          {/* Cover Image */}
          {board.cover_image && (
            <div className="aspect-[3/1] relative rounded-xl overflow-hidden mb-6">
              <Image
                src={board.cover_image}
                alt={board.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{board.title}</h1>
          
          {board.description && (
            <p className="text-base sm:text-lg text-gray-600 mb-4 italic">
              "{board.description}"
            </p>
          )}

          {/* Curator Section */}
          <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl p-4 sm:p-6 mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">Curated by</p>
            <div className="flex items-start gap-4">
              {/* Curator Photo */}
              <Link href={`/profile/${curator?.username || board.users.username}`}>
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white shadow-lg">
                  {curator?.profile_photo ? (
                    <Image
                      src={curator.profile_photo}
                      alt={curator.name}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {curator?.name?.[0] || board.users.name?.[0] || '?'}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              
              {/* Curator Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${curator?.username || board.users.username}`} className="hover:text-blue-600 transition-colors">
                  <h3 className="font-bold text-lg text-gray-900">{curator?.name || board.users.name}</h3>
                  <p className="text-gray-500 text-sm">@{curator?.username || board.users.username}</p>
                </Link>
                {curator?.bio && (
                  <p className="text-gray-600 text-sm mt-2 line-clamp-2">{curator.bio}</p>
                )}
              </div>
              
              {/* Follow Button */}
              {user && user.id !== board.user_id && (
                <button
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <FiHeart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow Board'}
                </button>
              )}
            </div>
          </div>

          {/* Social Proof & Stats Bar */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full">
              <FiHeart className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-700">
                {followerCount === 0 ? 'Be the first to follow' : `Followed by ${followerCount} ${followerCount === 1 ? 'person' : 'people'}`}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full">
              <FiUsers className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-700">{pins.length} creators</span>
            </div>
            <span className="text-gray-400">•</span>
            <span>{board.is_public ? '🌐 Public' : '🔒 Private'}</span>
          </div>
        </div>

        {/* Section Header for Pins */}
        {pins.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Creators in this board</h2>
            <p className="text-gray-500 text-sm">Hand-picked by @{curator?.username || board.users.username}</p>
          </div>
        )}

        {/* Pins Grid */}
        {pins.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pins yet</h3>
            <p className="text-gray-600 mb-6">
              {isOwner 
                ? "Start exploring creators and pin them to this board"
                : "This board doesn't have any pins yet"
              }
            </p>
            {isOwner && (
              <Link
                href="/explore"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Explore Creators
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {pins.map((pin) => (
              <div key={pin.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100">
                {/* Large Creator Photo */}
                <div className="aspect-[4/5] relative">
                  <Link href={`/profile/${pin.users.username}`} className="block w-full h-full">
                    {pin.users.profile_photo ? (
                      <Image
                        src={pin.users.profile_photo}
                        alt={pin.users.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white text-5xl sm:text-6xl font-bold">
                          {pin.users.name?.[0] || pin.users.username[0]}
                        </span>
                      </div>
                    )}
                  </Link>
                  
                  {/* Overlay Buttons */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Save/Pin Button */}
                    <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                      <button
                        className="flex-1 bg-white/90 backdrop-blur-sm text-gray-900 py-2.5 px-4 rounded-full text-sm font-semibold hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // TODO: Implement save to own board
                          alert('Save to your boards - Coming soon!');
                        }}
                      >
                        <FiBookmark className="w-4 h-4" />
                        Save
                      </button>
                      <Link
                        href={`/profile/${pin.users.username}`}
                        className="bg-blue-600 text-white py-2.5 px-4 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                  
                  {/* Remove Button for Owner */}
                  {isOwner && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openRemoveModal(pin);
                        }}
                        className="bg-red-500/90 backdrop-blur-sm text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                        title="Remove from board"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Creator Info */}
                <div className="p-4">
                  <Link href={`/profile/${pin.users.username}`} className="block group/link">
                    <h3 className="font-bold text-gray-900 text-base group-hover/link:text-blue-600 transition-colors truncate">
                      {pin.users.name}
                    </h3>
                    <p className="text-gray-500 text-sm">@{pin.users.username}</p>
                  </Link>
                  
                  {pin.users.bio && (
                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">{pin.users.bio}</p>
                  )}
                  
                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      📌 <span className="font-medium text-gray-700">{pin.users.pin_count}</span> pins
                    </span>
                    <span className="flex items-center gap-1">
                      👁️ <span className="font-medium text-gray-700">{pin.users.view_count}</span> views
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Remove Pin Confirmation Modal */}
      {showRemoveModal && pinToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Remove from Board?</h2>
            
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              {pinToRemove.users.profile_photo ? (
                <Image
                  src={pinToRemove.users.profile_photo}
                  alt={pinToRemove.users.name}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {pinToRemove.users.name?.[0] || '?'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900">{pinToRemove.users.name}</p>
                <p className="text-sm text-gray-500">@{pinToRemove.users.username}</p>
              </div>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Are you sure you want to remove this creator from your board?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setPinToRemove(null);
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                disabled={removing}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemovePin(pinToRemove.id)}
                disabled={removing}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {removing ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Link Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Invite to Board</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Share this link to invite someone to collaborate on "{board?.title}". The link expires in 7 days.
            </p>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={copyInviteLink}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  inviteCopied 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {inviteCopied ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                {inviteCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            
            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full py-2 text-gray-600 hover:text-gray-900"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Board Members</h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              {/* Owner */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                  <span className="text-white font-bold">
                    {board?.users.name?.[0] || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{board?.users.name}</p>
                  <p className="text-sm text-gray-500">@{board?.users.username}</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Owner</span>
              </div>
              
              {/* Members */}
              {members.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No other members yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                        {member.users.profile_photo ? (
                          <Image
                            src={member.users.profile_photo}
                            alt={member.users.name}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold">
                            {member.users.name?.[0] || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{member.users.name}</p>
                        <p className="text-sm text-gray-500">@{member.users.username}</p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full capitalize">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowMembersModal(false)}
              className="w-full py-2 mt-4 text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Join Board Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            {!joinSuccess ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiUserPlus className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Join "{board?.title}"?</h2>
                  <p className="text-gray-600">
                    Your request will be sent to the board owner for approval. Once approved, you'll be pinned to this board.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={requestToJoin}
                    disabled={requestingJoin}
                    className="flex-1 py-3 px-4 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {requestingJoin ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Request'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h2>
                  <p className="text-gray-600">
                    The board owner will be notified. You'll receive a notification when they respond.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinSuccess(false);
                  }}
                  className="w-full py-3 px-4 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Got it!
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Leave Board Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            {!leaveSuccess ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiX className="w-8 h-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Leave "{board?.title}"?</h2>
                  <p className="text-gray-600">
                    You will be removed from this board. You can request to join again later if you change your mind.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-3 px-4 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLeaveBoard}
                    disabled={leavingBoard}
                    className="flex-1 py-3 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {leavingBoard ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Leaving...
                      </>
                    ) : (
                      'Leave Board'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheck className="w-8 h-8 text-gray-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">You've Left the Board</h2>
                  <p className="text-gray-600">
                    You're no longer a member of this board. You can request to join again anytime.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    setLeaveSuccess(false);
                  }}
                  className="w-full py-3 px-4 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  Got it!
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
