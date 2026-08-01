"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { FiArrowRight, FiBarChart2, FiClock, FiDollarSign, FiPlus, FiUsers } from 'react-icons/fi';

type BoardSummary = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
};

type ProductSummary = {
  id: string;
  name: string;
  price: number | null;
  purchase_count: number;
  click_count: number;
};

export default function KeysDashboardPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setBoards([]);
          setProducts([]);
          return;
        }

        const [boardsResult, productsResult] = await Promise.all([
          supabase.from('boards').select('id, title, description, is_public').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('product_cards').select('id, name, price, purchase_count, click_count').eq('creator_id', user.id).order('created_at', { ascending: false }),
        ]);

        setBoards((boardsResult.data || []) as BoardSummary[]);
        setProducts((productsResult.data || []) as ProductSummary[]);
      } catch (error) {
        console.error('Error loading vault dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totals = useMemo(() => ({
    revenue: products.reduce((sum, product) => sum + (product.price || 0) * product.purchase_count, 0),
    claims: products.reduce((sum, product) => sum + product.purchase_count, 0),
    clicks: products.reduce((sum, product) => sum + product.click_count, 0),
  }), [products]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
        <Link href="/profile/me" className="text-[#D4AF37] hover:text-[#F0C94A]">Back to profile</Link>
        <span>/</span>
        <span>Vault control</span>
      </div>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#F0F0F5]">Vault control</h1>

      <section className="mt-6 rounded-[32px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">This week</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <Metric label="Revenue" value={`$${totals.revenue.toFixed(0)}`} icon={<FiDollarSign className="h-4 w-4" />} />
          <Metric label="Claims" value={String(totals.claims)} icon={<FiBarChart2 className="h-4 w-4" />} />
          <Metric label="Views" value={String(totals.clicks)} icon={<FiClock className="h-4 w-4" />} />
          <Metric label="Boards" value={String(boards.length)} icon={<FiUsers className="h-4 w-4" />} />
        </div>
        <div className="mt-6 h-36 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(10,10,15,0.92))] p-4">
          <div className="flex h-full items-end gap-2">
            {[18, 34, 24, 58, 44, 70, 86].map((height) => (
              <div key={height} className="flex-1 rounded-t-full bg-[#D4AF37]/80" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-4 rounded-[32px] border border-white/10 bg-[#12121A] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Your vaults</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Manage boards and public pages</h2>
            </div>
            <Link href="/boards" className="inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">
              <FiPlus className="h-4 w-4" /> New board
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4 text-sm text-[#9CA3AF]">Loading your boards...</div>
            ) : boards.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4 text-sm text-[#9CA3AF]">No boards yet. Create your first board to start managing unlocks.</div>
            ) : (
              boards.map((board) => (
                <div key={board.id} className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-[#F0F0F5]">{board.title}</div>
                      <div className="mt-1 text-sm text-[#9CA3AF]">{board.description || 'No description yet'}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#F0F0F5]">{board.is_public ? 'Open' : 'Invite-only'}</span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Link href={`/b/${board.title.toLowerCase().replace(/\s+/g, '-')}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]">
                      View public
                      <FiArrowRight className="h-4 w-4" />
                    </Link>
                    <button className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-sm font-semibold text-[#D4AF37]">
                      Manage
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-[32px] border border-white/10 bg-[#0A0A0F] p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Top performing cards</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">See what people save and claim</h2>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-4 text-sm text-[#9CA3AF]">Loading inventory...</div>
            ) : products.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-[#12121A] p-4 text-sm text-[#9CA3AF]">No cards yet. Add a product or unlock after you create content.</div>
            ) : (
              products.map((product, index) => (
                <div key={product.id} className="rounded-[24px] border border-white/10 bg-[#12121A] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-[#F0F0F5]">{index + 1}. {product.name}</div>
                      <div className="mt-1 text-sm text-[#9CA3AF]">{product.purchase_count} claims · {product.click_count} clicks</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[#D4AF37]">{product.price ? `$${product.price}` : '$0'}</div>
                      <div className="text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">revenue</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link href="/keys/inventory/new" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
            Add new unlock <FiPlus className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[32px] border border-white/10 bg-[#12121A] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Recent activity</p>
          <div className="mt-4 space-y-3 text-sm text-[#C7CAD1]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">No recent activity yet</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Invite someone to start activity</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Create a board to see updates here</div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">Add a product to see claims</div>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,26,1),rgba(212,175,55,0.07))] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Payouts</p>
          <div className="mt-3 text-4xl font-semibold text-[#F0F0F5]">${totals.revenue.toFixed(2)}</div>
          <p className="mt-2 text-sm text-[#9CA3AF]">Available for transfer</p>
          <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
            Transfer to bank <FiArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#6B7280]">Next payout: when you create sales · Lifetime: $0.00</p>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]">{icon}</div>
      <div className="mt-3 text-3xl font-semibold text-[#F0F0F5]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">{label}</div>
    </div>
  );
}
