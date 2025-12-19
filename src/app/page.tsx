"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PinProfileModal from '@/components/PinProfileModal';

interface Creator {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  profile_photo: string | null;
  country: string | null;
  tags_created: string[];
  pin_count: number;
  view_count: number;
  links: any[];
}

interface Board {
  id: string;
  title: string;
  description: string | null;
  pin_count: number;
  preview_profiles: Creator[];
  created_at: string;
  cover_image?: string | null;
  is_public?: boolean;
  user?: {
    username: string;
    name: string;
    profile_photo: string | null;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [recommendedCreators, setRecommendedCreators] = useState<Creator[]>([]);
  const [trendingCreators, setTrendingCreators] = useState<Creator[]>([]);
  const [yourBoards, setYourBoards] = useState<Board[]>([]);
  const [recommendedBoards, setRecommendedBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ id: string, name: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      setLoading(true);
      
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Load recommended creators
        await loadRecommendedCreators(user);
        
        // Load trending creators
        await loadTrendingCreators();
        
        // Load user's boards if logged in
        if (user) {
          await loadUserBoards(user.id);
        }
        
        // Load recommended public boards from other users
        await loadRecommendedBoards(user);
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  const loadRecommendedCreators = async (user: any) => {
    let query = supabase
      .from('users')
      .select(`
        id, username, name, bio, profile_photo, country, tags_created,
        pin_count:pins!profile_id(count),
        view_count
      `)
      .limit(12);

    if (user) {
      // Get current user's preferences
      const { data: currentUser } = await supabase
        .from('users')
        .select('tags_created, tags_liked')
        .eq('id', user.id)
        .maybeSingle();

      const userTags = [
        ...(currentUser?.tags_created || []),
        ...(currentUser?.tags_liked || [])
      ];

      if (userTags.length > 0) {
        query = query.overlaps('tags_created', userTags).neq('id', user.id);
      } else {
        query = query.neq('id', user.id);
      }
    }

    const { data, error } = await query;
    
    if (!error && data) {
      console.log('Recommended creators loaded:', data);
      console.log('First creator profile_photo:', data[0]?.profile_photo);
      setRecommendedCreators(data.map(creator => ({
        ...creator,
        pin_count: creator.pin_count?.[0]?.count || 0,
        links: []
      })));
    }
  };

  const loadTrendingCreators = async () => {
    // Get creators with most pins in last 7 days
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, username, name, bio, profile_photo, country, tags_created,
        pin_count:pins!profile_id(count),
        view_count
      `)
      .order('pin_count', { ascending: false })
      .limit(8);

    if (!error && data) {
      console.log('Trending creators loaded:', data);
      console.log('First trending creator profile_photo:', data[0]?.profile_photo);
      setTrendingCreators(data.map(creator => ({
        ...creator,
        pin_count: creator.pin_count?.[0]?.count || 0,
        links: []
      })));
    }
  };

  const loadUserBoards = async (userId: string) => {
    const { data, error } = await supabase
      .from('boards')
      .select(`
        id, title, description, created_at, is_public, cover_image,
        pin_count:pins(count),
        pins(
          users!profile_id(id, username, name, profile_photo)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (!error && data) {
      const formattedBoards = data.map(board => ({
        ...board,
        pin_count: board.pin_count?.[0]?.count || 0,
        preview_profiles: board.pins?.slice(0, 4).map(pin => pin.users) || []
      }));
      setYourBoards(formattedBoards as any);
    }
  };

  const loadRecommendedBoards = async (currentUser: any) => {
    // Load public boards from other users
    let query = supabase
      .from('boards')
      .select('id, title, description, created_at, cover_image, user_id')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6);

    // Exclude current user's boards if logged in
    if (currentUser) {
      query = query.neq('user_id', currentUser.id);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      // Load additional data for each board
      const formattedBoards = await Promise.all(data.map(async (board) => {
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

        return {
          ...board,
          pin_count: pinsData?.length || 0,
          preview_profiles: pinsData?.map(pin => pin.users) || [],
          user: userData || { username: 'unknown', name: 'Unknown', profile_photo: null }
        };
      }));
      setRecommendedBoards(formattedBoards as any);
    }
  };

  const handlePinProfile = async (profileId: string, profileName: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Open the pin profile modal with the selected profile
    setSelectedProfile({ id: profileId, name: profileName });
    setIsPinModalOpen(true);
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section for Non-logged in Users */}
        {!user && (
          <div className="text-center py-10 sm:py-16 mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
              Pinterest for Creators
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              Discover amazing creators, organize them into boards, and share your collections. 
              Help creators be discovered, remembered, and pinned.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
              <Link 
                href="/auth/signup" 
                className="bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-medium hover:bg-blue-700"
              >
                Get Started
              </Link>
              <Link 
                href="/explore" 
                className="bg-gray-100 text-gray-900 px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-medium hover:bg-gray-200"
              >
                Explore Creators
              </Link>
            </div>
          </div>
        )}

        {/* Your Boards - Only for logged in users */}
        {user && yourBoards.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Boards</h2>
              <Link href="/boards" className="text-sm sm:text-base text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {yourBoards.map((board) => (
                <Link key={board.id} href={`/boards/${board.id}`} className="group">
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex h-40">
                    {/* Left side - Board Preview Image */}
                    <div className="w-2/5 bg-gray-100 relative flex-shrink-0">
                      {board.cover_image ? (
                        <Image
                          src={board.cover_image}
                          alt={board.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : board.preview_profiles.length > 0 ? (
                        <div className="grid grid-cols-2 gap-0.5 h-full p-1">
                          {board.preview_profiles.slice(0, 4).map((profile, index) => (
                            <div key={index} className="relative overflow-hidden rounded-sm">
                              {profile.profile_photo ? (
                                <Image
                                  src={profile.profile_photo}
                                  alt={profile.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    {profile.name?.[0]?.toUpperCase() || '?'}
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
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">📋</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right side - Board Info */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {board.title}
                        </h3>
                        {board.description && (
                          <p className="text-gray-500 text-sm line-clamp-2">{board.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{board.pin_count} pins</span>
                        <span>{board.is_public ? '🌐 Public' : '🔒 Private'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Discover Boards - Public boards from other users */}
        {recommendedBoards.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Discover Boards</h2>
              <Link href="/explore?tab=boards" className="text-sm sm:text-base text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedBoards.map((board) => (
                <Link key={board.id} href={`/boards/${board.id}`} className="group">
                  <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden">
                    {/* Board Cover */}
                    <div className="aspect-video bg-gray-100 relative">
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
                              {profile.profile_photo ? (
                                <Image
                                  src={profile.profile_photo}
                                  alt={profile.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">
                                    {profile.name?.[0]?.toUpperCase() || '?'}
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
                          <span className="text-white text-3xl">📋</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Board Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {board.title}
                      </h3>
                      {board.description && (
                        <p className="text-gray-500 text-sm line-clamp-2 mb-2">{board.description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                          {board.user?.profile_photo ? (
                            <Image
                              src={board.user.profile_photo}
                              alt={board.user.name}
                              width={20}
                              height={20}
                              className="rounded-full"
                              unoptimized
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[10px]">
                              {board.user?.name?.[0] || '?'}
                            </div>
                          )}
                          <span>@{board.user?.username}</span>
                        </div>
                        <span>{board.pin_count} pins</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recommended Creators */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
            {user ? 'Recommended for You' : 'Featured Creators'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {recommendedCreators.map((creator) => (
              <div key={creator.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className="aspect-square relative">
                  <Link href={`/profile/${creator.username}`} className="relative block w-full h-full">
                    {/* Gradient fallback - always rendered as background */}
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center absolute inset-0 z-0">
                      <span className="text-white text-4xl font-bold">
                        {creator.name?.[0]?.toUpperCase() || creator.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    {/* Image on top - hides on error to show gradient */}
                    {creator.profile_photo && (
                      <img
                        src={creator.profile_photo}
                        alt={creator.name}
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </Link>
                  {/* Hover overlay with gradient for better visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex items-end justify-end p-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePinProfile(creator.id, creator.name);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 4a1 1 0 01.117 1.993L16 6h-.764l-1.39 4.17a2.001 2.001 0 01-.322 5.826L13.382 16H12v5a1 1 0 01-1.993.117L10 21v-5H8.618l-.142.004a2.001 2.001 0 01-.322-5.834L6.764 6H6a1 1 0 01-.117-1.993L6 4h10z"/>
                      </svg>
                      Pin
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <Link href={`/profile/${creator.username}`} className="block">
                    <h3 className="font-semibold text-gray-900 truncate">{creator.name}</h3>
                    <p className="text-gray-600 text-sm">@{creator.username}</p>
                    {creator.bio && (
                      <p className="text-gray-700 text-sm mt-2 line-clamp-2">{creator.bio}</p>
                    )}
                  </Link>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>{creator.country}</span>
                    <span>Pinned by {creator.pin_count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Creators */}
        <section className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Trending Creators</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {trendingCreators.map((creator, index) => (
              <div key={creator.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group">
                <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold z-30">
                  #{index + 1}
                </div>
                <div className="aspect-square relative">
                  <Link href={`/profile/${creator.username}`} className="relative block w-full h-full">
                    {/* Gradient fallback - always rendered as background */}
                    <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center absolute inset-0 z-0">
                      <span className="text-white text-4xl font-bold">
                        {creator.name?.[0]?.toUpperCase() || creator.username?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    {/* Image on top - hides on error to show gradient */}
                    {creator.profile_photo && (
                      <img
                        src={creator.profile_photo}
                        alt={creator.name}
                        className="w-full h-full object-cover absolute inset-0 z-10"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </Link>
                  {/* Hover overlay with gradient for better visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex items-end justify-end p-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePinProfile(creator.id, creator.name);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 4a1 1 0 01.117 1.993L16 6h-.764l-1.39 4.17a2.001 2.001 0 01-.322 5.826L13.382 16H12v5a1 1 0 01-1.993.117L10 21v-5H8.618l-.142.004a2.001 2.001 0 01-.322-5.834L6.764 6H6a1 1 0 01-.117-1.993L6 4h10z"/>
                      </svg>
                      Pin
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <Link href={`/profile/${creator.username}`} className="block">
                    <h3 className="font-semibold text-gray-900 truncate">{creator.name}</h3>
                    <p className="text-gray-600 text-sm">@{creator.username}</p>
                    {creator.bio && (
                      <p className="text-gray-700 text-sm mt-2 line-clamp-2">{creator.bio}</p>
                    )}
                  </Link>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>{creator.country}</span>
                    <span className="text-orange-600 font-medium">🔥 {creator.pin_count} pins</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Invite Creators Section */}
        <section className="mt-8 sm:mt-12">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl p-5 sm:p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 text-center md:text-left">
              <div className="flex-1">
                <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 mb-2">
                  <span className="text-2xl sm:text-3xl">✨</span>
                  <h2 className="text-xl sm:text-2xl font-bold">Know an amazing creator?</h2>
                </div>
                <p className="text-white/90 text-sm sm:text-base">
                  Help your favorite creators join Identify and get discovered! Share this invite link with them.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 sm:gap-3">
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Invite a Creator
                    </>
                  )}
                </button>
                <span className="text-white/70 text-sm">💖 Spread the love!</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Pin Profile Modal */}
      {isPinModalOpen && selectedProfile && (
        <PinProfileModal
          isOpen={isPinModalOpen}
          onClose={() => {
            setIsPinModalOpen(false);
            setSelectedProfile(null);
          }}
          profileId={selectedProfile.id}
          profileName={selectedProfile.name}
        />
      )}
    </div>
  );
}