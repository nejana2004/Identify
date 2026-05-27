"use client";

import { useState, useEffect } from 'react';
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
  pin_count: number;
  cover_image: string | null;
  preview_profiles: Creator[];
  follower_count?: number;
  user?: {
    username: string;
    name: string;
    profile_photo: string | null;
  };
}

interface Creator {
  id: string;
  username: string;
  name: string;
  profile_photo: string | null;
}

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [discoverBoards, setDiscoverBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedBoardId, setCopiedBoardId] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newBoard, setNewBoard] = useState({
    title: '',
    description: '',
    is_public: true
  });
  const [creating, setCreating] = useState(false);

  const handleShareBoard = async (e: React.MouseEvent, boardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shareUrl = `${window.location.origin}/boards/${boardId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedBoardId(boardId);
      setTimeout(() => setCopiedBoardId(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedBoardId(boardId);
      setTimeout(() => setCopiedBoardId(null), 2000);
    }
  };

  useEffect(() => {
    async function loadBoards() {
      setLoading(true);
      
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        setUser(user);

        // Load user's boards with pin counts and preview profiles
        const { data: boardsData, error } = await supabase
          .from('boards')
          .select(`
            id, title, description, is_public, created_at, cover_image
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // For each board, get pins and profile previews
        const formattedBoards = await Promise.all(boardsData.map(async (board) => {
          const { data: pinsData } = await supabase
            .from('pins')
            .select(`
              id,
              users!profile_id(id, username, name, profile_photo)
            `)
            .eq('board_id', board.id)
            .limit(4);

          return {
            id: board.id,
            title: board.title,
            description: board.description,
            is_public: board.is_public,
            created_at: board.created_at,
            cover_image: board.cover_image || null,
            pin_count: pinsData?.length || 0,
            preview_profiles: pinsData?.map(pin => ({
              id: pin.users.id,
              username: pin.users.username,
              name: pin.users.name,
              profile_photo: pin.users.profile_photo
            })) || []
          };
        }));

        setBoards(formattedBoards);

        // Load public boards from other users
        const { data: discoverData, error: discoverError } = await supabase
          .from('boards')
          .select('id, title, description, created_at, cover_image, user_id')
          .eq('is_public', true)
          .neq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(8);

        if (!discoverError && discoverData && discoverData.length > 0) {
          // Load additional data for each board
          const formattedDiscover = await Promise.all(discoverData.map(async (board) => {
            // Get user info
            const { data: userData } = await supabase
              .from('users')
              .select('username, name, profile_photo')
              .eq('id', board.user_id)
              .maybeSingle();

            // Get pins with profiles
            const { data: pinsData } = await supabase
              .from('pins')
              .select('users!profile_id(id, username, name, profile_photo)')
              .eq('board_id', board.id)
              .limit(4);

            // Get follower count
            const { count: followerCount } = await supabase
              .from('board_followers')
              .select('*', { count: 'exact', head: true })
              .eq('board_id', board.id);

            return {
              id: board.id,
              title: board.title,
              description: board.description,
              is_public: true,
              created_at: board.created_at,
              cover_image: board.cover_image || null,
              pin_count: pinsData?.length || 0,
              preview_profiles: pinsData?.map(pin => pin.users) || [],
              follower_count: followerCount || 0,
              user: userData || { username: 'unknown', name: 'Unknown', profile_photo: null }
            };
          }));
          setDiscoverBoards(formattedDiscover as any);
        }
      } catch (error) {
        console.error('Error loading boards:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBoards();
  }, [router]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newBoard.title.trim()) return;
    
    setCreating(true);
    
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          user_id: user.id,
          title: newBoard.title.trim(),
          description: newBoard.description.trim() || null,
          is_public: newBoard.is_public
        })
        .select()
        .single();

      if (error) throw error;

      // Add to boards list
      setBoards([{
        ...data,
        cover_image: null,
        pin_count: 0,
        preview_profiles: []
      }, ...boards]);

      // Reset form
      setNewBoard({ title: '', description: '', is_public: true });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    setDeleting(true);

    try {
      // First delete all pins in this board (foreign key constraint)
      const { error: pinsError } = await supabase
        .from('pins')
        .delete()
        .eq('board_id', boardId);

      if (pinsError) {
        console.error('Error deleting pins:', pinsError);
        // Continue anyway - might not have any pins
      }

      // Then delete the board
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)
        .eq('user_id', user.id); // Ensure user owns the board

      if (error) throw error;

      setBoards(boards.filter(board => board.id !== boardId));
      setShowDeleteModal(false);
      setBoardToDelete(null);
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (e: React.MouseEvent, board: Board) => {
    e.preventDefault();
    e.stopPropagation();
    setBoardToDelete(board);
    setShowDeleteModal(true);
  };

  const toggleBoardVisibility = async (boardId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('boards')
        .update({ is_public: !currentVisibility })
        .eq('id', boardId);

      if (error) throw error;

      setBoards(boards.map(board =>
        board.id === boardId ? { ...board, is_public: !currentVisibility } : board
      ));
    } catch (error) {
      console.error('Error updating board visibility:', error);
      alert('Failed to update board visibility');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">My Boards</h1>
            <p className="text-sm md:text-base text-gray-600">Organize your favorite creators into collections</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full sm:w-auto text-center"
          >
            Create Board
          </button>
        </div>

        {/* Boards Grid */}
        {boards.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-6">
              <svg className="mx-auto h-24 w-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
            <p className="text-gray-600 mb-6">Start by creating your first board to organize creators</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Create Your First Board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {boards.map((board) => (
              <div key={board.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Board Preview */}
                <Link href={`/boards/${board.id}`} className="block">
                  <div className="aspect-square bg-gray-100 relative">
                    {/* Show cover image if exists */}
                    {board.cover_image ? (
                      <Image
                        src={board.cover_image}
                        alt={board.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : board.preview_profiles.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 p-2 h-full">
                        {board.preview_profiles.slice(0, 4).map((profile, index) => (
                          <div key={index} className="relative rounded overflow-hidden">
                            {profile.profile_photo ? (
                              <Image
                                src={profile.profile_photo}
                                alt={profile.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                <span className="text-white text-lg font-bold">
                                  {profile.name?.[0] || profile.username[0]}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Fill empty slots */}
                        {Array.from({ length: 4 - board.preview_profiles.length }).map((_, index) => (
                          <div key={`empty-${index}`} className="bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <p className="text-gray-500 text-sm">Empty Board</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Board Info */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/boards/${board.id}`} className="block flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{board.title}</h3>
                    </Link>
                    <div className="flex space-x-1 ml-2">
                      {board.is_public && (
                        <button
                          onClick={(e) => handleShareBoard(e, board.id)}
                          className={`transition-colors ${copiedBoardId === board.id ? 'text-green-500' : 'text-gray-400 hover:text-blue-600'}`}
                          title={copiedBoardId === board.id ? 'Copied!' : 'Copy Share Link'}
                        >
                          {copiedBoardId === board.id ? '✓' : '🔗'}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleBoardVisibility(board.id, board.is_public);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title={board.is_public ? 'Make Private' : 'Make Public'}
                      >
                        {board.is_public ? '🌐' : '🔒'}
                      </button>
                      <button
                        onClick={(e) => openDeleteModal(e, board)}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete Board"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  {board.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{board.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{board.pin_count} pins</span>
                    <span className="text-xs">
                      {board.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Discover Boards Section */}
        {discoverBoards.length > 0 && (
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Discover Boards</h2>
              <Link href="/explore?tab=boards" className="text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {discoverBoards.map((board) => (
                <Link key={board.id} href={`/boards/${board.id}`} className="group">
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden">
                    {/* Board Cover */}
                    <div className="aspect-square bg-gray-100 relative">
                      {board.cover_image ? (
                        <Image
                          src={board.cover_image}
                          alt={board.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : board.preview_profiles && board.preview_profiles.length > 0 ? (
                        <div className="grid grid-cols-2 gap-0.5 h-full p-1">
                          {board.preview_profiles.slice(0, 4).map((profile: any, index: number) => (
                            <div key={index} className="relative overflow-hidden rounded-sm">
                              {profile?.profile_photo ? (
                                <Image
                                  src={profile.profile_photo}
                                  alt={profile.name || 'Profile'}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                  <span className="text-white text-lg font-bold">
                                    {profile?.name?.[0]?.toUpperCase() || '?'}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                          {Array.from({ length: Math.max(0, 4 - board.preview_profiles.length) }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-gray-200 rounded-sm"></div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                          <span className="text-white text-4xl">📋</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Board Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {board.title}
                      </h3>
                      {board.description && (
                        <p className="text-gray-500 text-sm line-clamp-2 mb-3 italic">"{board.description}"</p>
                      )}
                      
                      {/* Curated by */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-400">Curated by</span>
                        <div className="flex items-center gap-1.5">
                          {board.user?.profile_photo ? (
                            <Image
                              src={board.user.profile_photo}
                              alt={board.user.name || 'User'}
                              width={20}
                              height={20}
                              className="rounded-full"
                              unoptimized
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold">
                              {board.user?.name?.[0] || '?'}
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-700">@{board.user?.username}</span>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          ❤️ <span className="font-medium">{board.follower_count || 0}</span> followers
                        </span>
                        <span className="flex items-center gap-1">
                          📌 <span className="font-medium">{board.pin_count}</span> creators
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Invite Creators Section */}
        <div className="mt-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">Know a great creator?</h2>
              <p className="text-white/90">
                Invite your favorite creators to join Identify! Share this link with them so they can create their profile and be discovered.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => {
                  const inviteUrl = `${window.location.origin}/auth/signup?ref=${user?.id || 'invite'}`;
                  navigator.clipboard.writeText(inviteUrl);
                  setInviteCopied(true);
                  setTimeout(() => setInviteCopied(false), 2000);
                }}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${
                  inviteCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-purple-600 hover:bg-gray-100'
                }`}
              >
                {inviteCopied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Copy Invite Link
                  </>
                )}
              </button>
              <span className="text-white/70 text-sm">🎁 Help grow the community!</span>
            </div>
          </div>
        </div>
      </main>

      {/* Create Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Board</h2>
            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Board Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={newBoard.title}
                  onChange={(e) => setNewBoard({ ...newBoard, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  maxLength={50}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newBoard.description}
                  onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={200}
                />
              </div>
              
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newBoard.is_public}
                    onChange={(e) => setNewBoard({ ...newBoard, is_public: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Make this board public (others can view it)
                  </span>
                </label>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={creating || !newBoard.title.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Board'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewBoard({ title: '', description: '', is_public: true });
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Board Confirmation Modal */}
      {showDeleteModal && boardToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Delete Board?</h2>
            
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <p className="font-semibold text-gray-900">{boardToDelete.title}</p>
              {boardToDelete.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{boardToDelete.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {boardToDelete.pin_count} {boardToDelete.pin_count === 1 ? 'pin' : 'pins'} • {boardToDelete.is_public ? 'Public' : 'Private'}
              </p>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Are you sure you want to delete this board? All pins in this board will be removed. This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setBoardToDelete(null);
                }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBoard(boardToDelete.id)}
                disabled={deleting}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
