"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar - horizontal scroll on mobile */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">Settings</h2>
            
            {/* Mobile: horizontal tabs, Desktop: vertical list */}
            <nav className="flex md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-2 px-2 md:mx-0 md:px-0">
              <Link 
                href="/settings/profile"
                className={`whitespace-nowrap px-3 py-2 rounded-md text-sm md:text-base ${
                  isActive('/settings/profile') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Profile
              </Link>
              
              <Link 
                href="/settings/boards"
                className={`whitespace-nowrap px-3 py-2 rounded-md text-sm md:text-base ${
                  isActive('/settings/boards') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Boards
              </Link>
              
              <Link 
                href="/settings/account"
                className={`whitespace-nowrap px-3 py-2 rounded-md text-sm md:text-base ${
                  isActive('/settings/account') 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Account
              </Link>
              
            </nav>
            
            <div className="hidden md:block mt-8 pt-4 border-t border-gray-200">
              <Link 
                href="/"
                className="text-blue-600 hover:underline text-sm"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
