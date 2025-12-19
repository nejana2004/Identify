"use client";

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

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

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [board, setBoard] = useState<Board | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [pinToRemove, setPinToRemove] = useState<Pin | null>(null);
  const [removing, setRemoving] = useState(false);

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
        setIsOwner(user?.id === completeBoard.user_id);

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
            <div className="flex space-x-2">
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
            <p className="text-sm sm:text-base text-gray-600 mb-4">{board.description}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-2 sm:space-x-4 text-xs sm:text-sm text-gray-500">
            <span>By @{board.users.username}</span>
            <span className="hidden sm:inline">•</span>
            <span>{pins.length} pins</span>
            <span className="hidden sm:inline">•</span>
            <span>{board.is_public ? 'Public' : 'Private'}</span>
            <span className="hidden sm:inline">•</span>
            <span>Created {new Date(board.created_at).toLocaleDateString()}</span>
          </div>
        </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {pins.map((pin) => (
              <div key={pin.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="aspect-square relative">
                  <Link href={`/profile/${pin.users.username}`} className="block w-full h-full">
                    {pin.users.profile_photo ? (
                      <Image
                        src={pin.users.profile_photo}
                        alt={pin.users.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-white text-2xl sm:text-4xl font-bold">
                          {pin.users.name?.[0] || pin.users.username[0]}
                        </span>
                      </div>
                    )}
                  </Link>
                  
                  {isOwner && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openRemoveModal(pin);
                        }}
                        className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600"
                        title="Remove from board"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-3 sm:p-4">
                  <Link href={`/profile/${pin.users.username}`} className="block hover:text-blue-600 transition-colors">
                    <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{pin.users.name}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm">@{pin.users.username}</p>
                    {pin.users.bio && (
                      <p className="text-gray-700 text-xs sm:text-sm mt-1 sm:mt-2 line-clamp-2 hidden sm:block">{pin.users.bio}</p>
                    )}
                  </Link>
                  
                  {/* Stats */}
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>Pinned {new Date(pin.created_at).toLocaleDateString()}</span>
                    <div className="flex space-x-2">
                      <span>📌 {pin.users.pin_count}</span>
                      <span>👁️ {pin.users.view_count}</span>
                    </div>
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
    </div>
  );
}
