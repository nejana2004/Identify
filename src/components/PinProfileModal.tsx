"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

interface Board {
  id: string;
  title: string;
  description: string | null;
}

interface PinProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
}

export default function PinProfileModal({ isOpen, onClose, profileId, profileName }: PinProfileModalProps) {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUserBoards();
    }
  }, [isOpen]);

  const fetchUserBoards = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(user);

      const { data, error } = await supabase
        .from('boards')
        .select('id, title, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setBoards(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async () => {
    if (!selectedBoard) {
      setError('Please select a board first.');
      return;
    }

    setPinning(true);
    setError('');
    setSuccess('');

    try {
      console.log('=== PIN DEBUG START ===');
      console.log('Profile ID to pin:', profileId);
      console.log('Board ID selected:', selectedBoard);
      
      // Check all users to see what exists
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, username, name')
        .limit(10);
        
      console.log('First 10 users in public.users:', allUsers);
      
      // First, verify the profile exists in public.users
      const { data: profileCheck, error: profileError } = await supabase
        .from('users')
        .select('id, username, name')
        .eq('id', profileId)
        .single();
        
      if (profileError) {
        console.log('Profile NOT found in public.users:', profileError);
        console.log('Profile ID details:', {
          id: profileId,
          type: typeof profileId,
          length: profileId?.length
        });
        
        // Try to check if it exists in auth.users
        const { data: authCheck } = await supabase.auth.admin.getUserById(profileId);
        console.log('Profile in auth.users:', authCheck);
        
        setError(`Profile not found in database. This might be a data synchronization issue. Profile ID: ${profileId}`);
        return;
      }
      
      console.log('Profile found in public.users:', profileCheck);
      
      // Verify the board exists and belongs to the user
      const { data: boardCheck, error: boardError } = await supabase
        .from('boards')
        .select('id, title, user_id')
        .eq('id', selectedBoard)
        .single();
        
      if (boardError) {
        console.log('Board NOT found:', boardError);
        throw new Error(`Board not found: ${boardError.message}`);
      }
      
      console.log('Board found:', boardCheck);

      // Check if already pinned
      const { data: existingPin, error: checkError } = await supabase
        .from('pins')
        .select('id')
        .eq('board_id', selectedBoard)
        .eq('profile_id', profileId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing pin:', checkError);
        throw new Error(`Check error: ${checkError.message}`);
      }

      if (existingPin) {
        setError('This profile is already pinned to this board.');
        setPinning(false);
        return;
      }

      console.log('Attempting to insert pin with:', {
        board_id: selectedBoard,
        profile_id: profileId
      });

      const { data: insertData, error: insertError } = await supabase
        .from('pins')
        .insert({
          board_id: selectedBoard,
          profile_id: profileId
        })
        .select();

      if (insertError) {
        console.error('Pin insert error:', insertError);
        console.log('Insert error details:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          profile_id: profileId,
          profile_id_type: typeof profileId,
          board_id: selectedBoard,
          board_id_type: typeof selectedBoard
        });
        console.log('=== PIN DEBUG END ===');
        throw new Error(`Insert failed: ${insertError.message || 'Unknown error'}`);
      }

      console.log('Pin inserted successfully:', insertData);
      console.log('=== PIN DEBUG END ===');
      setSuccess(`${profileName} has been pinned to your board!`);
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
        setSuccess('');
        setSelectedBoard('');
      }, 1500);
      
    } catch (err: any) {
      console.error('Error pinning profile:', err.message);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setPinning(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) {
      setError('Board title is required.');
      return;
    }

    setPinning(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          user_id: user.id,
          title: newBoardTitle.trim(),
          description: null,
          is_public: true
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new board to state
      setBoards([data, ...boards]);
      setNewBoardTitle('');
      setShowCreateBoard(false);
      
      // Pin directly with the new board ID (don't rely on state which hasn't updated yet)
      await pinToBoard(data.id);
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating board:', err);
      setPinning(false);
    }
  };

  // Separate function to pin to a specific board
  const pinToBoard = async (boardId: string) => {
    setError('');
    setSuccess('');

    try {
      console.log('=== PIN TO BOARD DEBUG ===');
      console.log('Profile ID to pin:', profileId);
      console.log('Board ID:', boardId);

      // First, verify the profile exists
      const { data: profileCheck, error: profileError } = await supabase
        .from('users')
        .select('id, username, name')
        .eq('id', profileId)
        .single();
        
      if (profileError) {
        console.log('Profile NOT found:', profileError);
        setError(`Profile not found in database.`);
        setPinning(false);
        return;
      }

      // Check if already pinned
      const { data: existingPin, error: checkError } = await supabase
        .from('pins')
        .select('id')
        .eq('board_id', boardId)
        .eq('profile_id', profileId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Check error: ${checkError.message}`);
      }

      if (existingPin) {
        setError('This profile is already pinned to this board.');
        setPinning(false);
        return;
      }

      // Insert the pin
      const { data: insertData, error: insertError } = await supabase
        .from('pins')
        .insert({
          board_id: boardId,
          profile_id: profileId
        })
        .select();

      if (insertError) {
        console.error('Pin insert error:', insertError);
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      console.log('Pin inserted successfully:', insertData);
      setSuccess(`${profileName} has been pinned to your board!`);
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
        setSuccess('');
        setSelectedBoard('');
      }, 1500);
      
    } catch (err: any) {
      console.error('Error pinning profile:', err.message);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setPinning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold">Pin {profileName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm flex items-center">
                <span className="mr-2">✓</span>
                {success}
              </div>
            )}

            {!showCreateBoard ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select a board to pin to:
                  </label>
                  
                  {boards.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <p className="text-gray-500 mb-3">You don't have any boards yet.</p>
                      <button
                        onClick={() => setShowCreateBoard(true)}
                        className="text-blue-600 hover:underline"
                      >
                        Create your first board
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {boards.map(board => (
                          <label key={board.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name="board"
                              value={board.id}
                              checked={selectedBoard === board.id}
                              onChange={(e) => setSelectedBoard(e.target.value)}
                              className="h-4 w-4 text-blue-600"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">{board.title}</div>
                              {board.description && (
                                <div className="text-sm text-gray-500">{board.description}</div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setShowCreateBoard(true)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        + Create new board
                      </button>
                    </>
                  )}
                </div>

                {boards.length > 0 && (
                  <div className="flex space-x-3">
                    <button
                      onClick={handlePin}
                      disabled={pinning || !selectedBoard}
                      className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pinning ? 'Pinning...' : '📌 Pin to Board'}
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Create new board:
                  </label>
                  <input
                    type="text"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    placeholder="e.g. Tech Entrepreneurs"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={50}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleCreateBoard}
                    disabled={pinning || !newBoardTitle.trim()}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {pinning ? 'Creating & Pinning...' : 'Create & Pin'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateBoard(false);
                      setNewBoardTitle('');
                      setError('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
