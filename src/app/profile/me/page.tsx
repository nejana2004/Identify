"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FaGlobe, FaInstagram, FaTwitter, FaTiktok, FaYoutube, FaLinkedin, FaGithub, 
         FaFacebook, FaDiscord, FaTwitch, FaSpotify, FaPinterest, FaSnapchatGhost, 
         FaWhatsapp, FaTelegram, FaEnvelope, FaLink } from 'react-icons/fa';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  profile_photo: string | null;
  country: string | null;
  tags_created: string[] | null;
  tags_liked: string[] | null;
  pin_count: number;
  view_count: number;
  board_count: number;
  created_at: string;
  email?: string;
}

interface UserLink {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  position: number;
  is_active: boolean;
}

interface Board {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  pin_count?: number;
}

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userLinks, setUserLinks] = useState<UserLink[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserProfile() {
      setLoading(true);
      setError(null);
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        setUser(user);

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileError) {
          console.error('Error loading profile:', profileError);
          throw profileError;
        }
        
        // If profile doesn't exist, create it
        if (!profileData) {
          console.log('Profile not found, creating new profile...');
          const username = user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`;
          const name = user.user_metadata?.name || user.user_metadata?.full_name || username;
          
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              username: username,
              name: name,
              email: user.email,
              pin_count: 0,
              view_count: 0,
              board_count: 0
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating profile:', createError);
            // Check if user needs to complete onboarding
            router.push('/onboarding');
            return;
          }
          
          setProfile({ ...newProfile, email: user.email });
        } else {
          setProfile({ ...profileData, email: user.email });
        }

        // Get user links
        const { data: linksData } = await supabase
          .from('user_links')
          .select('*')
          .eq('user_id', user.id)
          .order('position', { ascending: true });
          
        if (linksData) {
          setUserLinks(linksData);
        }

        // Get user boards
        const { data: boardsData } = await supabase
          .from('boards')
          .select(`
            *,
            pins(count)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (boardsData) {
          const boardsWithCounts = boardsData.map(board => ({
            ...board,
            pin_count: board.pins?.[0]?.count || 0
          }));
          setBoards(boardsWithCounts);
        }
        
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    
    loadUserProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
        <p className="text-gray-600 mb-6">We couldn't find your profile. Please complete your registration.</p>
        <Link href="/auth/onboarding" className="bg-blue-600 text-white px-4 py-2 rounded">
          Complete Registration
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-10 px-4">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {profile.profile_photo ? (
            <Image 
              src={profile.profile_photo} 
              alt={profile.name} 
              width={128} 
              height={128} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 text-4xl font-bold">
              {profile.name?.charAt(0).toUpperCase() || profile.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <h1 className="text-3xl font-bold">@{profile.username}</h1>
            
            <div className="flex gap-2">
              <Link 
                href="/settings/profile" 
                className="px-4 py-2 rounded font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Edit Profile
              </Link>
              
              <Link 
                href="/settings/links" 
                className="px-4 py-2 rounded font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Edit Links
              </Link>
            </div>
          </div>
          
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-1">{profile.name}</h2>
            {profile.bio && <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>}
            <p className="text-sm text-gray-500 mt-2">{profile.email}</p>
          </div>
          
          <div className="flex gap-6 text-sm mb-4">
            <div>
              <span className="font-semibold">{profile.board_count || 0}</span> boards
            </div>
            <div>
              <span className="font-semibold">{profile.pin_count || 0}</span> pins
            </div>
            <div>
              <span className="font-semibold">{profile.view_count || 0}</span> views
            </div>
          </div>

          {/* Tags */}
          {profile.tags_created && profile.tags_created.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Your Tags</h3>
              <div className="flex flex-wrap gap-2">
                {profile.tags_created.map((tag, index) => (
                  <span 
                    key={index}
                    className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Links Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Links</h2>
          <Link 
            href="/settings/links" 
            className="text-blue-600 hover:underline"
          >
            Manage Links
          </Link>
        </div>
        
        {userLinks.length > 0 ? (
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            {userLinks.filter(link => link.is_active).map((link) => {
              // Get platform-specific styling
              const getLinkStyle = (title: string, url: string) => {
                const lower = title.toLowerCase();
                const urlLower = url.toLowerCase();
                
                if (lower.includes('instagram') || urlLower.includes('instagram.com')) {
                  return {
                    bg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400',
                    hover: 'hover:from-purple-600 hover:via-pink-600 hover:to-orange-500',
                    icon: <FaInstagram className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('twitter') || lower.includes('x.com') || urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
                  return {
                    bg: 'bg-black',
                    hover: 'hover:bg-gray-800',
                    icon: <FaTwitter className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('youtube') || urlLower.includes('youtube.com')) {
                  return {
                    bg: 'bg-red-600',
                    hover: 'hover:bg-red-700',
                    icon: <FaYoutube className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('tiktok') || urlLower.includes('tiktok.com')) {
                  return {
                    bg: 'bg-black',
                    hover: 'hover:bg-gray-800',
                    icon: <FaTiktok className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('linkedin') || urlLower.includes('linkedin.com')) {
                  return {
                    bg: 'bg-blue-700',
                    hover: 'hover:bg-blue-800',
                    icon: <FaLinkedin className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('github') || urlLower.includes('github.com')) {
                  return {
                    bg: 'bg-gray-900',
                    hover: 'hover:bg-black',
                    icon: <FaGithub className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('whatsapp') || urlLower.includes('whatsapp.com') || urlLower.includes('wa.me')) {
                  return {
                    bg: 'bg-green-500',
                    hover: 'hover:bg-green-600',
                    icon: <FaWhatsapp className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('telegram') || urlLower.includes('t.me') || urlLower.includes('telegram.me')) {
                  return {
                    bg: 'bg-sky-500',
                    hover: 'hover:bg-sky-600',
                    icon: <FaTelegram className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('discord') || urlLower.includes('discord.')) {
                  return {
                    bg: 'bg-indigo-600',
                    hover: 'hover:bg-indigo-700',
                    icon: <FaDiscord className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('spotify') || urlLower.includes('spotify.com')) {
                  return {
                    bg: 'bg-green-600',
                    hover: 'hover:bg-green-700',
                    icon: <FaSpotify className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('twitch') || urlLower.includes('twitch.tv')) {
                  return {
                    bg: 'bg-purple-600',
                    hover: 'hover:bg-purple-700',
                    icon: <FaTwitch className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('email') || lower.includes('mail') || urlLower.includes('mailto:')) {
                  return {
                    bg: 'bg-amber-500',
                    hover: 'hover:bg-amber-600',
                    icon: <FaEnvelope className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('website') || lower.includes('portfolio') || lower.includes('blog')) {
                  return {
                    bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
                    hover: 'hover:from-blue-600 hover:to-cyan-600',
                    icon: <FaGlobe className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('facebook') || urlLower.includes('facebook.com') || urlLower.includes('fb.com')) {
                  return {
                    bg: 'bg-blue-600',
                    hover: 'hover:bg-blue-700',
                    icon: <FaFacebook className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('pinterest') || urlLower.includes('pinterest.com')) {
                  return {
                    bg: 'bg-red-600',
                    hover: 'hover:bg-red-700',
                    icon: <FaPinterest className="text-xl" />,
                    text: 'text-white'
                  };
                }
                if (lower.includes('snapchat') || urlLower.includes('snapchat.com')) {
                  return {
                    bg: 'bg-yellow-400',
                    hover: 'hover:bg-yellow-500',
                    icon: <FaSnapchatGhost className="text-xl" />,
                    text: 'text-black'
                  };
                }
                // Default colorful style
                return {
                  bg: 'bg-gradient-to-r from-violet-500 to-fuchsia-500',
                  hover: 'hover:from-violet-600 hover:to-fuchsia-600',
                  icon: <FaLink className="text-xl" />,
                  text: 'text-white'
                };
              };

              const style = getLinkStyle(link.title, link.url);

              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${style.bg} ${style.hover} ${style.text} text-center py-4 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-3`}
                >
                  {style.icon}
                  <span>{link.title}</span>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No links added yet</p>
            <Link 
              href="/settings/links"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Add Your First Link
            </Link>
          </div>
        )}
      </div>

      {/* My Products Section - Coming Soon */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-6">My Products</h2>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100 p-8">
          <div className="absolute top-4 right-4">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Coming Soon
            </span>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Showcase Your Products</h3>
            <p className="text-gray-600 max-w-sm">
              Soon you'll be able to list and sell your digital products, courses, templates, and more directly from your profile!
            </p>
          </div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-200 rounded-full opacity-50 blur-2xl"></div>
          <div className="absolute -top-4 -right-4 w-32 h-32 bg-pink-200 rounded-full opacity-50 blur-2xl"></div>
        </div>
      </div>
      
      {/* Boards Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Boards</h2>
          <Link 
            href="/boards" 
            className="text-blue-600 hover:underline"
          >
            Manage Boards
          </Link>
        </div>
        
        {boards.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {boards.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="group border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold truncate flex-1">{board.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    board.is_public 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {board.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                
                {board.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {board.description}
                  </p>
                )}
                
                <div className="text-xs text-gray-500">
                  {board.pin_count || 0} pins • {new Date(board.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No boards created yet</p>
            <Link 
              href="/boards"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Create Your First Board
            </Link>
          </div>
        )}
      </div>

      {/* Account Information */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Email:</span>
            <p className="text-gray-900">{profile.email}</p>
          </div>
          
          <div>
            <span className="text-sm font-medium text-gray-500">Member since:</span>
            <p className="text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
          
          {profile.country && (
            <div>
              <span className="text-sm font-medium text-gray-500">Country:</span>
              <p className="text-gray-900">{profile.country}</p>
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <Link 
            href="/settings/account"
            className="text-blue-600 hover:underline text-sm"
          >
            Account Settings →
          </Link>
        </div>
      </div>
    </div>
  );
}
