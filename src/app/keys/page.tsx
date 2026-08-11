"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { FiArrowRight, FiBookmark, FiEye, FiMousePointer, FiPlus, FiTrash2 } from 'react-icons/fi';

type InventoryCard = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  external_link: string | null;
  save_count: number;
  click_count: number;
  created_at: string;
};

export default function KeysDashboardPage() {
  const [cards, setCards] = useState<InventoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          setCards([]);
          return;
        }

        const { data } = await supabase
          .from('product_cards')
          .select('id, name, description, category, external_link, save_count, click_count, created_at')
          .eq('creator_id', user.id)
          .is('thread_id', null)
          .order('created_at', { ascending: false });

        setCards((data || []) as InventoryCard[]);
      } finally {
        setLoading(false);
      }
    }

    loadCards();
  }, []);

  const totals = useMemo(() => ({
    cards: cards.length,
    clicks: cards.reduce((sum, card) => sum + (card.click_count || 0), 0),
    saves: cards.reduce((sum, card) => sum + (card.save_count || 0), 0),
  }), [cards]);

  async function removeCard(cardId: string) {
    if (!window.confirm('Delete this inventory card?')) return;
    setDeletingId(cardId);

    const { error } = await supabase
      .from('product_cards')
      .delete()
      .eq('id', cardId)
      .is('thread_id', null);

    if (!error) {
      setCards((current) => current.filter((card) => card.id !== cardId));
    }

    setDeletingId(null);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
        <Link href="/me" className="text-[#D4AF37] hover:text-[#F0C94A]">Back to dashboard</Link>
        <span>/</span>
        <span>Inventory</span>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#F0F0F5]">Inventory</h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Manage the recommendation cards you can attach to boards and threads.</p>
        </div>
        <Link href="/keys/inventory/new" className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black">
          <FiPlus className="h-4 w-4" /> Add card
        </Link>
      </div>

      <section className="mt-5 grid gap-3 md:grid-cols-3">
        <Metric label="Cards" value={String(totals.cards)} icon={<FiBookmark className="h-4 w-4" />} />
        <Metric label="Clicks" value={String(totals.clicks)} icon={<FiMousePointer className="h-4 w-4" />} />
        <Metric label="Saves" value={String(totals.saves)} icon={<FiEye className="h-4 w-4" />} />
      </section>

      <section className="mt-5 rounded-[16px] border border-white/10 bg-[#121212] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F0F0F5]">Your cards</h2>
          <Link href="/search?filter=cards" className="text-sm text-[#D4AF37]">Search all cards</Link>
        </div>

        <div className="mt-3 space-y-2">
          {loading ? <EmptyState text="Loading inventory..." /> : null}
          {!loading && cards.length === 0 ? <EmptyState text="No inventory cards yet." /> : null}
          {!loading && cards.map((card) => (
            <div key={card.id} className="rounded-[12px] border border-white/10 bg-[#0B0B0B] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-[#F0F0F5]">{card.name}</div>
                  <div className="mt-1 text-sm text-[#8D8D8D]">{card.description || 'No description'}</div>
                  <div className="mt-2 text-xs text-[#6B7280]">{card.category} · {card.click_count} clicks · {card.save_count} saves</div>
                </div>
                <div className="flex items-center gap-2">
                  {card.external_link ? <a href={card.external_link} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-[#171717] px-3 py-1.5 text-xs text-[#D7D7D7]">Open</a> : null}
                  <button onClick={() => removeCard(card.id)} disabled={deletingId === card.id} className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-xs text-red-200 disabled:opacity-60">
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-white/10 bg-[#0B0B0B] p-4">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]">{icon}</div>
      <div className="mt-3 text-3xl font-semibold text-[#F0F0F5]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">{label}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[12px] border border-white/10 bg-[#0B0B0B] p-4 text-sm text-[#9CA3AF]">{text}</div>;
}
