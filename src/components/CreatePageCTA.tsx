"use client";

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Homepage "create a page" CTAs should skip signup and go straight to the boards
// directory for users who are already logged in.
export default function CreatePageCTA({ children, className }: { children: ReactNode; className?: string }) {
  const [href, setHref] = useState('/auth/signup');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) {
        setHref('/boards');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
