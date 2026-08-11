"use client";

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';

export default function LegacyBoardRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    async function redirectToCanonical() {
      const { data } = await supabase.from('boards').select('title, slug').eq('id', id).maybeSingle();
      if (!data) {
        router.replace('/boards');
        return;
      }

      router.replace(`/b/${data.slug || slugify(data.title)}`);
    }

    redirectToCanonical();
  }, [id, router]);

  return <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-[#9CA3AF]">Redirecting to board...</div>;
}
