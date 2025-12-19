"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

interface Collection {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  item_count: number;
}

export default function CollectionsPage({ params }: { params: { username: string } }) {
  const { username } = params;
  const [collections, setCollections] = useState<Collection[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCollections() {
      setLoading(true);
      setError(null);
      
      try {
        // First get the user's profile
        const { data: profileData, error: profileError } = await supabase.rpc(
          'get_user_profile',
          { lookup_username: username }
        );
        
        if (profileError) throw profileError;
        
        if (!profileData) {
          setError('Profile not found');
          setLoading(false);
          return;
        }
        
        setProfile(profileData);
        
        // Then get their collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('is_private', false)
          .order('created_at', { ascending: false });
          
        if (collectionsError) throw collectionsError;
        
        // For each collection, get the count of items
        const collectionsWithCounts = await Promise.all(collectionsData.map(async (collection) => {
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
        console.error('Error loading collections:', err);
        setError(err.message || 'Failed to load collections');
      } finally {
        setLoading(false);
      }
    }
    
    loadCollections();
  }, [username]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
        <p className="text-gray-600 mb-6">{error || "The user you're looking for doesn't exist."}</p>
        <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded">
          Go Home
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto pt-10 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/profile/${username}`} className="text-blue-600 hover:underline">
          ← Back to profile
        </Link>
        <h1 className="text-2xl font-bold">{profile.name || username}'s Collections</h1>
      </div>
      
      {collections.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">No Collections Yet</h2>
          <p className="text-gray-600">This user hasn't created any public collections yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collection/${collection.id}`}
              className="group"
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
                {collection.cover_image ? (
                  <Image
                    src={collection.cover_image}
                    alt={collection.name}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                    No Cover
                  </div>
                )}
              </div>
              <h3 className="font-semibold truncate mb-1">{collection.name}</h3>
              {collection.description && (
                <p className="text-gray-600 text-sm line-clamp-2">{collection.description}</p>
              )}
              <p className="text-gray-500 text-sm mt-2">
                {collection.item_count} {collection.item_count === 1 ? 'item' : 'items'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
