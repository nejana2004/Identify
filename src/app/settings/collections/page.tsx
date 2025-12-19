"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  is_private: boolean;
  created_at: string;
  item_count?: number;
}

export default function CollectionsSettingsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    is_private: false
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
        
        // Load user's collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (collectionsError) throw collectionsError;
        
        // For each collection, get the count of items
        const collectionsWithCounts = await Promise.all((collectionsData || []).map(async (collection) => {
          const { count, error: countError } = await supabase
            .from('collection_items')
            .select('*', { count: 'exact', head: true })
            .eq('collection_id', collection.id);
            
          return {
            ...collection,
            item_count: count || 0
          };
        }));
        
        setCollections(collectionsWithCounts);
      } catch (err: any) {
        setError(err.message);
        console.error('Error loading collections:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [router]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCollection({ ...newCollection, [name]: value });
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNewCollection({ ...newCollection, [name]: checked });
  };
  
  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!newCollection.name.trim()) {
      setError('Collection name is required');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          user_id: user.id,
          name: newCollection.name.trim(),
          description: newCollection.description.trim() || null,
          is_private: newCollection.is_private
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setCollections([{ ...data, item_count: 0 }, ...collections]);
      setNewCollection({
        name: '',
        description: '',
        is_private: false
      });
      setSuccess('Collection created successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating collection:', err);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection? This will also remove all items from this collection.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setCollections(collections.filter(collection => collection.id !== id));
      setSuccess('Collection deleted successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('Error deleting collection:', err);
    }
  };
  
  const handleTogglePrivacy = async (id: string, isPrivate: boolean) => {
    try {
      const { error } = await supabase
        .from('collections')
        .update({ is_private: !isPrivate })
        .eq('id', id);
        
      if (error) throw error;
      
      setCollections(collections.map(collection => 
        collection.id === id ? { ...collection, is_private: !isPrivate } : collection
      ));
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating collection privacy:', err);
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
      <h1 className="text-2xl font-bold mb-6">Manage Collections</h1>
      
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
        <h2 className="text-xl font-semibold mb-4">Create New Collection</h2>
        <form onSubmit={handleAddCollection} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Collection Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newCollection.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={newCollection.description}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_private"
              name="is_private"
              checked={newCollection.is_private}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="is_private" className="ml-2 text-sm text-gray-700">
              Private Collection (only visible to you)
            </label>
          </div>
          
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Collection'}
          </button>
        </form>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">Your Collections</h2>
      {collections.length === 0 ? (
        <p className="text-gray-500 italic">You haven't created any collections yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map((collection) => (
            <div 
              key={collection.id} 
              className="bg-white rounded-lg shadow p-4 flex"
            >
              <div className="h-20 w-20 bg-gray-100 rounded mr-4 flex-shrink-0">
                {collection.cover_image ? (
                  <Image
                    src={collection.cover_image}
                    alt={collection.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover rounded"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">
                    No Cover
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="font-semibold">{collection.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTogglePrivacy(collection.id, collection.is_private)}
                      className="text-gray-500 hover:text-gray-700"
                      title={collection.is_private ? 'Make Public' : 'Make Private'}
                    >
                      {collection.is_private ? '🔒' : '🌐'}
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(collection.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {collection.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{collection.description}</p>
                )}
                
                <div className="mt-2 flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    {collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}
                  </span>
                  
                  <Link
                    href={`/collections/${collection.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit Items
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
