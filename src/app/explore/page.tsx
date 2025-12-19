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
}

interface Board {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  pin_count: number;
  created_at: string;
  user: {
    username: string;
    name: string;
    profile_photo: string | null;
  };
  preview_profiles: any[];
}

const CONTENT_TAGS = [
  'Art & Design', 'Photography', 'Music', 'Writing', 'Coding', 'Cooking',
  'Fashion', 'Fitness', 'Travel', 'Gaming', 'Business', 'Education',
  'Comedy', 'Beauty', 'DIY', 'Tech', 'Sports', 'Nature', 'Books', 'Movies'
];

const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany',
  'France', 'Japan', 'Brazil', 'India', 'Mexico', 'Spain', 'Italy',
  'Netherlands', 'Sweden', 'South Korea', 'Other'
];

export default function ExplorePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'creators' | 'boards' | 'products'>('creators');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [filteredBoards, setFilteredBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [sortBy, setSortBy] = useState('popular'); // popular, newest, most_pinned
  const [user, setUser] = useState<any>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Creator | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        // Load all creators
        const { data: creatorsData, error: creatorsError } = await supabase
          .from('users')
          .select('id, username, name, bio, profile_photo, country, tags_created, pin_count, view_count')
          .order('pin_count', { ascending: false });

        if (creatorsError) throw creatorsError;

        setCreators(creatorsData || []);
        setFilteredCreators(creatorsData || []);

        // Load all public boards
        const { data: boardsData, error: boardsError } = await supabase
          .from('boards')
          .select(`
            id, title, description, created_at, cover_image, user_id
          `)
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        console.log('Boards query result:', { boardsData, boardsError });

        if (boardsError) {
          console.error('Error loading boards:', boardsError);
        }
        
        if (boardsData && boardsData.length > 0) {
          // Load additional data for each board
          const formattedBoards = await Promise.all(boardsData.map(async (board) => {
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
          
          console.log('Formatted boards:', formattedBoards);
          setBoards(formattedBoards as any);
          setFilteredBoards(formattedBoards as any);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'creators') {
      filterAndSortCreators();
    } else {
      filterAndSortBoards();
    }
  }, [searchQuery, selectedTags, selectedCountry, sortBy, creators, boards, activeTab]);

  const filterAndSortBoards = () => {
    let filtered = [...boards];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(board =>
        board.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        board.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        board.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort boards
    switch (sortBy) {
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'most_pinned':
        filtered = filtered.sort((a, b) => b.pin_count - a.pin_count);
        break;
      default: // popular
        filtered = filtered.sort((a, b) => b.pin_count - a.pin_count);
    }

    setFilteredBoards(filtered);
  };

  const filterAndSortCreators = () => {
    let filtered = [...creators];

    console.log('Filtering creators:', {
      totalCreators: creators.length,
      searchQuery,
      selectedTags,
      selectedCountry,
      sortBy
    });

    // Filter by search query (includes country)
    if (searchQuery) {
      filtered = filtered.filter(creator =>
        creator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.country?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log('After search filter:', filtered.length);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(creator => {
        const hasTag = creator.tags_created && Array.isArray(creator.tags_created) && 
                      selectedTags.some(tag => creator.tags_created.includes(tag));
        return hasTag;
      });
      console.log('After tag filter:', filtered.length);
    }

    // Filter by country
    if (selectedCountry) {
      filtered = filtered.filter(creator => creator.country === selectedCountry);
      console.log('After country filter:', filtered.length);
    }

    // Sort creators
    switch (sortBy) {
      case 'newest':
        // Since we don't have created_at in this query, we'll use reverse order
        filtered = filtered.reverse();
        break;
      case 'most_pinned':
        filtered = filtered.sort((a, b) => b.pin_count - a.pin_count);
        break;
      case 'most_viewed':
        filtered = filtered.sort((a, b) => b.view_count - a.view_count);
        break;
      default: // popular
        filtered = filtered.sort((a, b) => (b.pin_count + b.view_count) - (a.pin_count + a.view_count));
    }

    console.log('Final filtered count:', filtered.length);
    setFilteredCreators(filtered);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCountry('');
    setSortBy('popular');
  };

  const handlePinProfile = async (creator: Creator) => {
    console.log('=== EXPLORE PAGE PIN DEBUG ===');
    console.log('Creator object being pinned:', creator);
    console.log('Creator ID:', creator.id);
    console.log('Creator ID type:', typeof creator.id);
    console.log('Creator ID length:', creator.id?.length);
    console.log('Creator username:', creator.username);
    console.log('Creator name:', creator.name);
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setSelectedProfile(creator);
    setPinModalOpen(true);
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
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Explore</h1>
          <p className="text-sm sm:text-base text-gray-600">Discover amazing creators and curated boards</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveTab('creators')}
            className={`px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'creators'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👤 Creators
          </button>
          <button
            onClick={() => setActiveTab('boards')}
            className={`px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'boards'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Boards
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === 'products'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            🛍️ Products
          </button>
        </div>

        {/* Filters - Only show for creators and boards */}
        {activeTab !== 'products' && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Search Bar */}
          <div className="mb-4 sm:mb-6">
            <input
              type="text"
              placeholder={activeTab === 'creators' ? "Search by name, username, bio, or country..." : "Search boards by title or description..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter Controls - Only for Creators */}
          {activeTab === 'creators' && (
          <div className="space-y-4 sm:space-y-6 mb-4 sm:mb-6">
            {/* Tags Filter - Full Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Types
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Country and Sort Filters - Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Country Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Countries</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="popular">Most Popular</option>
                  <option value="most_pinned">Most Pinned</option>
                  <option value="most_viewed">Most Viewed</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          </div>
          )}

          {/* Sort for Boards */}
          {activeTab === 'boards' && (
            <div className="w-full sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="popular">Most Popular</option>
                <option value="most_pinned">Most Pins</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          )}

          {/* Active Filters & Clear */}
          {activeTab === 'creators' && (
          <div className="flex flex-wrap items-center gap-2">
            {selectedTags.length > 0 && (
              <span className="text-sm text-gray-600">
                Tags: {selectedTags.join(', ')}
              </span>
            )}
            {selectedCountry && (
              <span className="text-sm text-gray-600">
                Country: {selectedCountry}
              </span>
            )}
            {(selectedTags.length > 0 || selectedCountry || searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
          )}
        </div>
        )}

        {/* Results Count - Only for creators and boards */}
        {activeTab !== 'products' && (
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {activeTab === 'creators' ? filteredCreators.length + ' creators' : filteredBoards.length + ' boards'}
          </p>
        </div>
        )}

        {/* Boards Grid */}
        {activeTab === 'boards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredBoards.map((board) => (
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
                            alt={board.user.name || 'User'}
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
        )}

        {/* Creators Grid */}
        {activeTab === 'creators' && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {filteredCreators.map((creator) => (
            <div key={creator.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="aspect-square relative">
                <Link href={`/profile/${creator.username}`} className="relative block w-full h-full">
                  {/* Gradient fallback - always rendered as background */}
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center absolute inset-0 z-0">
                    <span className="text-white text-2xl sm:text-4xl font-bold">
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 flex items-end justify-end p-2 sm:p-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePinProfile(creator);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm sm:text-base font-medium shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-1 sm:gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 4a1 1 0 01.117 1.993L16 6h-.764l-1.39 4.17a2.001 2.001 0 01-.322 5.826L13.382 16H12v5a1 1 0 01-1.993.117L10 21v-5H8.618l-.142.004a2.001 2.001 0 01-.322-5.834L6.764 6H6a1 1 0 01-.117-1.993L6 4h10z"/>
                    </svg>
                    Pin
                  </button>
                </div>
              </div>
              <div className="p-3 sm:p-4">
                <Link href={`/profile/${creator.username}`} className="block hover:text-blue-600 transition-colors">
                  <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{creator.name}</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">@{creator.username}</p>
                  {creator.bio && (
                    <p className="text-gray-700 text-xs sm:text-sm mt-1 sm:mt-2 line-clamp-2 hidden sm:block">{creator.bio}</p>
                  )}
                </Link>
                
                {/* Tags */}
                {creator.tags_created.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {creator.tags_created.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {creator.tags_created.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{creator.tags_created.length - 2}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Stats */}
                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>{creator.country}</span>
                  <div className="flex space-x-2">
                    <span>📌 {creator.pin_count}</span>
                    <span>👁️ {creator.view_count}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Empty State */}
        {activeTab === 'creators' && filteredCreators.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No creators found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Empty State for Boards */}
        {activeTab === 'boards' && filteredBoards.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No boards found</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search terms</p>
          </div>
        )}

        {/* Products Tab - Coming Soon */}
        {activeTab === 'products' && (
          <div className="py-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100 p-12 max-w-2xl mx-auto">
              <div className="absolute top-4 right-4">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  Coming Soon
                </span>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Creator Products Marketplace</h3>
                <p className="text-gray-600 max-w-md mb-6">
                  Discover and purchase digital products, courses, templates, eBooks, and more from your favorite creators. A one-stop shop for creator economy!
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <span className="bg-white/70 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">📚 Courses</span>
                  <span className="bg-white/70 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">📝 Templates</span>
                  <span className="bg-white/70 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">🎨 Digital Art</span>
                  <span className="bg-white/70 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">📖 eBooks</span>
                  <span className="bg-white/70 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">🎵 Music</span>
                  <span className="bg-white/70 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">💼 Services</span>
                </div>
              </div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-200 rounded-full opacity-50 blur-2xl"></div>
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-pink-200 rounded-full opacity-50 blur-2xl"></div>
            </div>
          </div>
        )}

        {/* Invite Creators Section */}
        <div className="mt-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🎯</span>
                <h2 className="text-2xl font-bold">Can't find your favorite creator?</h2>
              </div>
              <p className="text-white/90">
                Invite them to join Identify! Share this link with creators you love so they can build their profile and grow their audience.
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Invite a Creator
                  </>
                )}
              </button>
              <span className="text-white/70 text-sm">🚀 Help creators get discovered!</span>
            </div>
          </div>
        </div>
      </main>

      {/* Pin Profile Modal */}
      {selectedProfile && (
        <PinProfileModal
          isOpen={pinModalOpen}
          onClose={() => {
            setPinModalOpen(false);
            setSelectedProfile(null);
          }}
          profileId={selectedProfile.id}
          profileName={selectedProfile.name}
        />
      )}
    </div>
  );
}
