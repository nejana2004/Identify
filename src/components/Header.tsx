"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthButton from './AuthButton';
import CreateBoardModal from './CreateBoardModal';
import { supabase } from '@/lib/supabaseClient';
import { FiBell, FiPlusCircle } from 'react-icons/fi';

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);

  const navItems = [
    { href: '/discover', label: 'Discover' },
    { href: '/boards', label: 'My Boards' },
    { href: '/search', label: 'Search' },
    { href: '/me', label: 'Me' },
  ];

  function isActive(href: string) {
    if (href === '/boards') {
      return pathname.startsWith('/boards') || pathname.startsWith('/b');
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  useEffect(() => {
    async function loadNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Get unread notification count
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false);

        setUnreadCount(count || 0);
      }
    }

    loadNotifications();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadNotifications();
      } else {
        setUnreadCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050508]/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4AF37]/50 bg-[#12121A] text-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.12)]">
                I
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-wide text-[#F0F0F5]">Identify</div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-[#6B7280]">Boards • posts • cards</div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${isActive(item.href) ? 'bg-white/5 text-[#F0F0F5]' : 'text-[#9CA3AF] hover:bg-white/5 hover:text-[#F0F0F5]'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side: Notifications + Auth + Mobile menu button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="#"
              onClick={(event) => {
                event.preventDefault();
                setShowCreateBoardModal(true);
              }}
              className="hidden items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#12121A] px-4 py-2 text-sm font-medium text-[#F0F0F5] transition hover:border-[#D4AF37] hover:bg-[#1A1A24] md:flex"
            >
              <FiPlusCircle className="h-4 w-4 text-[#D4AF37]" />
              Start a board
            </Link>

            {/* Notifications Icon - Only show when logged in */}
            {user && (
              <>
                <Link
                  href="/notifications"
                  className="relative rounded-full border border-white/10 bg-white/[0.03] p-2 text-[#9CA3AF] transition hover:border-[#D4AF37]/40 hover:text-[#F0F0F5]"
                  title="Notifications"
                >
                  <FiBell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-bold text-[#0A0A0F]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            
            {/* Auth Button - hidden on mobile when not logged in, shown when logged in */}
            <div className="hidden md:block">
              <AuthButton />
            </div>
            <div className="md:hidden">
              <AuthButton />
            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-[#9CA3AF] hover:bg-white/5 hover:text-[#F0F0F5]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#050508] md:hidden">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-3 text-base font-medium text-[#F0F0F5] hover:bg-white/5"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <>
                <Link 
                  href="/notifications" 
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-[#F0F0F5] hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <FiBell className="h-5 w-5" />
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-[#D4AF37] px-2 py-0.5 text-xs font-bold text-[#0A0A0F]">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link 
                  href="#" 
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium text-[#F0F0F5] hover:bg-white/5"
                  onClick={(event) => {
                    event.preventDefault();
                    setMobileMenuOpen(false);
                    setShowCreateBoardModal(true);
                  }}
                >
                  <FiPlusCircle className="h-5 w-5" />
                  Start a board
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <CreateBoardModal open={showCreateBoardModal} onClose={() => setShowCreateBoardModal(false)} />
    </header>
  );
}
