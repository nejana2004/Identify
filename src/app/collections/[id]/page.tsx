"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

interface Item {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  external_url: string | null;
  created_at: string;
  user_id: string;
}

interface Collection {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  user_id: string;
  username: string;
  user_name: string;
}

export default function CollectionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCollection() {
      setLoading(true);
      setError(null);
      
      try {
        // Get collection data with owner info
        const { data: collectionData, error: collectionError } = await supabase
          .from('collections')
          .select(`
            *,
            users:user_id (
              username,
              name
            )
          `)
          .eq('id', id)
          .single();
          
        if (collectionError) throw collectionError;
        
        if (!collectionData) {
          setError('Collection not found');
          setLoading(false);
          return;
        }
        
        // Format collection data
        const formattedCollection = {
          ...collectionData,
          username: collectionData.users.username,
          user_name: collectionData.users.name
        };
        
        setCollection(formattedCollection);
        
        // Get items in this collection
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select(`
            *,
            collection_items!inner(collection_id)
          `)
          .eq('collection_items.collection_id', id)
          .order('created_at', { ascending: false });
          
        if (itemsError) throw itemsError;
        
        if (itemsData) {
          setItems(itemsData);
        }
        
      } catch (err: any) {
        console.error('Error loading collection:', err);
        setError(err.message || 'Failed to load collection');
      } finally {
        setLoading(false);
      }
    }
    
    loadCollection();
  }, [id]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error || !collection) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Collection Not Found</h1>
        <p className="text-gray-600 mb-6">{error || "The collection you're looking for doesn't exist."}</p>
        <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded">
          Go Home
        </Link>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto pt-10 px-4">
      <div className="mb-8">
        <Link 
          href={`/profile/${collection.username}`} 
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Back to {collection.user_name || collection.username}'s profile
        </Link>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-2">{collection.name}</h1>
          {collection.description && (
            <p className="text-gray-700 mb-4">{collection.description}</p>
          )}
          <div className="flex items-center text-sm text-gray-600">
            <span>Created by </span>
            <Link 
              href={`/profile/${collection.username}`} 
              className="font-medium text-blue-600 hover:underline ml-1"
            >
              {collection.user_name || collection.username}
            </Link>
          </div>
        </div>
      </div>
      
      {items.length === 0 ? (
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">No Items Yet</h2>
          <p className="text-gray-600">This collection doesn't have any items yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div key={item.id} className="group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-3">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                    No Image
                  </div>
                )}
              </div>
              <h3 className="font-semibold truncate mb-1">{item.title}</h3>
              {item.description && (
                <p className="text-gray-600 text-sm line-clamp-2">{item.description}</p>
              )}
              {item.external_url && (
                <a 
                  href={item.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                >
                  View Source
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
