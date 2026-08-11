"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiLayers, FiLock, FiUser } from 'react-icons/fi';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function checkAuth() {
      setLoading(true);
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#D4AF37]"></div>
      </div>
    );
  }
  
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <div className="w-full flex-shrink-0 md:w-72">
          <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              Settings
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[#F0F0F5]">Manage your account</h2>
            <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Profile, boards, and account security all live here.</p>

            <nav className="mt-6 flex gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
              <Link 
                href="/settings/profile"
                className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm md:text-base ${
                  isActive('/settings/profile') 
                    ? 'bg-[#0A0A0F] text-[#F0F0F5] border border-[#D4AF37]/25' 
                    : 'text-[#9CA3AF] hover:bg-white/[0.03] hover:text-[#F0F0F5]'
                }`}
              >
                <span className="inline-flex items-center gap-2"><FiUser className="h-4 w-4" /> Profile</span>
              </Link>
              
              <Link 
                href="/settings/boards"
                className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm md:text-base ${
                  isActive('/settings/boards') 
                    ? 'bg-[#0A0A0F] text-[#F0F0F5] border border-[#D4AF37]/25' 
                    : 'text-[#9CA3AF] hover:bg-white/[0.03] hover:text-[#F0F0F5]'
                }`}
              >
                <span className="inline-flex items-center gap-2"><FiLayers className="h-4 w-4" /> Boards</span>
              </Link>
              
              <Link 
                href="/settings/account"
                className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm md:text-base ${
                  isActive('/settings/account') 
                    ? 'bg-[#0A0A0F] text-[#F0F0F5] border border-[#D4AF37]/25' 
                    : 'text-[#9CA3AF] hover:bg-white/[0.03] hover:text-[#F0F0F5]'
                }`}
              >
                <span className="inline-flex items-center gap-2"><FiLock className="h-4 w-4" /> Account</span>
              </Link>
            </nav>

            <div className="mt-8 border-t border-white/10 pt-4">
              <Link 
                href="/me"
                className="inline-flex items-center gap-2 text-sm text-[#D4AF37] hover:text-[#F0C94A]"
              >
                <FiArrowLeft className="h-4 w-4" /> Back to Me
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
