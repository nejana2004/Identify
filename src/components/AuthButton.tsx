"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    <Link href="/me" className="flex items-center space-x-3 rounded-lg p-2 transition-colors hover:bg-white/5">
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
              {(profile?.name || profile?.username || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="hidden md:block">
          <div className="text-sm font-medium text-[#F0F0F5]">
            {profile?.name || profile?.username || 'User'}
          </div>
          <div className="text-xs text-[#6B7280]">
            @{profile?.username || 'member'}
          </div>
        </div>
    </Link>
  );
}
