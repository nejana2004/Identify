"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get user profile data
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        
        setProfile(profileData);
      }
      
      setLoading(false);
    }

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      setProfile(null);
      setShowDropdown(false);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center space-x-2 md:space-x-3">
        <Link 
          href="/auth/login"
          className="text-gray-700 hover:text-gray-900 font-medium text-sm md:text-base"
        >
          Sign In
        </Link>
        <Link 
          href="/auth/signup"
          className="bg-black text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm md:text-base"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
          {profile?.profile_photo ? (
            <Image
              src={profile.profile_photo}
              alt={profile.name || profile.username || 'Profile'}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500 text-sm font-bold">
              {(profile?.name || profile?.username || user.email)?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="hidden md:block">
          <div className="text-sm font-medium text-gray-900">
            {profile?.name || profile?.username || 'User'}
          </div>
          <div className="text-xs text-gray-500">
            @{profile?.username || 'username'}
          </div>
        </div>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          ></div>
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border z-20">
            <div className="p-3 border-b">
              <div className="font-medium text-gray-900">
                {profile?.name || profile?.username || 'User'}
              </div>
              <div className="text-sm text-gray-500">
                {user.email}
              </div>
            </div>
            
            <div className="py-1">
              {profile?.username && (
                <Link
                  href={`/profile/${profile.username}`}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowDropdown(false)}
                >
                  View Profile
                </Link>
              )}
              
              <Link
                href="/profile/me"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowDropdown(false)}
              >
                My Profile
              </Link>
              
              <Link
                href="/boards"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowDropdown(false)}
              >
                My Boards
              </Link>
              
              <Link
                href="/settings/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={() => setShowDropdown(false)}
              >
                Settings
              </Link>
            </div>
            
            <div className="border-t py-1">
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
