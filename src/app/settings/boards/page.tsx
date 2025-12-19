"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Board {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  pin_count?: number;
}

export default function BoardsSettingsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoard, setNewBoard] = useState({
    title: '',
    description: '',
    is_public: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        setUser(user);
        
        // Load user's boards
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (boardsError) throw boardsError;
        
        // For each board, get the count of pins
        const boardsWithCounts = await Promise.all((boardsData || []).map(async (board) => {
          const { count, error: countError } = await supabase
            .from('pins')
            .select('*', { count: 'exact', head: true })
            .eq('board_id', board.id);
            
          return {
            ...board,
            pin_count: count || 0
          };
        }));
        
        setBoards(boardsWithCounts);
      } catch (err: any) {
        setError(err.message);
        console.error('Error loading boards:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [router]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewBoard({ ...newBoard, [name]: value });
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNewBoard({ ...newBoard, [name]: checked });
  };
  
  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!newBoard.title.trim()) {
      setError('Board title is required');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
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
      
      setBoards([{ ...data, pin_count: 0 }, ...boards]);
      setNewBoard({
        title: '',
        description: '',
        is_public: true
      });
      setSuccess('Board created successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating board:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteBoard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this board? This will also remove all pins from this board.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setBoards(boards.filter(board => board.id !== id));
      setSuccess('Board deleted successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting board:', err);
    }
  };
  
  const handleTogglePrivacy = async (id: string, isPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('boards')
        .update({ is_public: !isPublic })
        .eq('id', id);
        
      if (error) throw error;
      
      setBoards(boards.map(board => 
        board.id === id ? { ...board, is_public: !isPublic } : board
      ));
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating board privacy:', err);
    }
  };
  
  if (loading) {
    return (
      <div className="max-w-full">
        <h1 className="text-2xl font-bold mb-6">Loading...</h1>
      </div>
    );
  }
  
  return (
    <div className="max-w-full">
      <h1 className="text-2xl font-bold mb-6">Manage Boards</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Board</h2>
        <form onSubmit={handleAddBoard} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Board Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={newBoard.title}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
              maxLength={50}
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={newBoard.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              rows={3}
              maxLength={200}
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              checked={newBoard.is_public}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="is_public" className="ml-2 text-sm text-gray-700">
              Public Board (others can view it)
            </label>
          </div>
          
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Board'}
          </button>
        </form>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Your Boards</h2>
      {boards.length === 0 ? (
        <p className="text-gray-500 italic">You haven't created any boards yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {boards.map((board) => (
            <div 
              key={board.id} 
              className="bg-white rounded-lg shadow p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{board.title}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleTogglePrivacy(board.id, board.is_public)}
                    className="text-gray-500 hover:text-gray-700"
                    title={board.is_public ? 'Make Private' : 'Make Public'}
                  >
                    {board.is_public ? '🌐' : '🔒'}
                  </button>
                  <button
                    onClick={() => handleDeleteBoard(board.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              {board.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{board.description}</p>
              )}
              
              <div className="mt-3 flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  {board.pin_count} {board.pin_count === 1 ? 'pin' : 'pins'}
                </span>
                
                <div className="flex space-x-2">
                  <Link
                    href={`/boards/${board.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View Board
                  </Link>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs text-gray-400">
                    {board.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
