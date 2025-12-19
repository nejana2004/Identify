"use client";

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { trackProfileView } from '@/lib/analytics';
import { FaGlobe, FaInstagram, FaTwitter, FaTiktok, FaYoutube, FaLinkedin, FaGithub, 
         FaFacebook, FaDiscord, FaTwitch, FaSpotify, FaPinterest, FaSnapchatGhost, 
         FaWhatsapp, FaTelegram, FaEnvelope, FaLink } from 'react-icons/fa';

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { username } = resolvedParams;
  const [profile, setProfile] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);
      
      try {
        // Get the current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
        
        // Query the database directly for the user profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .maybeSingle();
          
        if (profileError) {
          console.error('Profile error:', profileError);
          setError('Profile not found');
          setLoading(false);
          return;
        }
        
        if (!profileData) {
          setError('Profile not found');
          setLoading(false);
          return;
        }
        
        setProfile(profileData);
        
        // Track profile view
        if (profileData.id) {
          trackProfileView(profileData.id);
        }
        
        // Check if current user is following this profile (skip for now since follows table may not exist)
        // if (user) {
        //   const { data: followData } = await supabase
        //     .from('follows')
        //     .select('*')
        //     .eq('follower_id', user.id)
        //     .eq('following_id', profileData.id)
        //     .maybeSingle();
        //     
        //   setIsFollowing(!!followData);
        // }
        
        // Load boards instead of collections (since we have boards table)
        const { data: boardsData } = await supabase
          .from('boards')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(6);
          
        if (boardsData) {
          setCollections(boardsData);
        }
        
        // Load links
        const { data: linksData } = await supabase
          .from('user_links')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('is_active', true)
          .order('position', { ascending: true });
          
        if (linksData) {
          setLinks(linksData);
        }
          
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [username]);
  
  const handleFollow = async () => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }
    
    // Follow functionality disabled until follows table is created
    console.log('Follow functionality not yet implemented');
    
    // try {
    //   if (isFollowing) {
    //     // Unfollow
    //     await supabase
    //       .from('follows')
    //       .delete()
    //       .eq('follower_id', currentUser.id)
    //       .eq('following_id', profile.id);
    //       
    //     setIsFollowing(false);
    //   } else {
    //     // Follow
    //     await supabase
    //       .from('follows')
    //       .insert({
    //         follower_id: currentUser.id,
    //         following_id: profile.id
    //       });
    //       
    //     setIsFollowing(true);
    //   }
    //   
    //   // Update follower count in the UI
    //   setProfile((prev: any) => ({
    //     ...prev,
    //     follower_count: isFollowing 
    //       ? Math.max(0, (prev.follower_count || 0) - 1) 
    //       : ((prev.follower_count || 0) + 1)
    //   }));
    //   
    // } catch (err) {
    //   console.error('Error following/unfollowing:', err);
    // }
  };
  
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
            <h1 className="text-3xl font-bold">{profile.username}</h1>
            
            {currentUser && currentUser.id === profile.id && (
              <Link 
                href="/settings/profile" 
                className="px-4 py-2 rounded font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Edit Profile
              </Link>
            )}
          </div>
          
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">{profile.name}</h2>
            {profile.bio && <p className="text-gray-700 whitespace-pre-line mb-3">{profile.bio}</p>}
            {profile.country && (
              <p className="text-gray-600 text-sm">📍 {profile.country}</p>
            )}
          </div>
          
          <div className="flex gap-6 text-sm">
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
        </div>
      </div>
      
      {/* Links Section (Linktree-like) */}
      {links.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Links</h2>
          <div className="flex flex-col gap-3 max-w-md mx-auto">
            {links.map((link) => {
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
        </div>
      )}

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
      
      {/* Boards Section (Pinterest-like) */}
      {collections.length > 0 && (
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Boards</h2>
            <Link href={`/profile/${username}/boards`} className="text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}`}
                className="group"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
                  {board.cover_image ? (
                    <Image
                      src={board.cover_image}
                      alt={board.title}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                      No Cover
                    </div>
                  )}
                </div>
                <h3 className="font-semibold truncate">{board.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
