"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { FiBarChart2, FiClock, FiDollarSign, FiPlus, FiUsers } from 'react-icons/fi';

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

export default function MyProfilePage() {
  const [displayName, setDisplayName] = useState('your account');
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setDisplayName('your account');
          setBoards([]);
          setProducts([]);
          return;
        }

        const [profileResult, boardsResult, productsResult] = await Promise.all([
          supabase.from('users').select('name, username, email').eq('id', user.id).maybeSingle(),
          supabase.from('boards').select('id, title, description, is_public').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('product_cards').select('id, name, price, purchase_count, click_count').eq('creator_id', user.id).order('created_at', { ascending: false }),
        ]);

        const profile = profileResult.data;
        setDisplayName(profile?.name || profile?.username || user.email?.split('@')[0] || 'your account');
        setBoards((boardsResult.data || []) as BoardSummary[]);
        setProducts((productsResult.data || []) as ProductSummary[]);
      } catch (error) {
        console.error('Error loading profile page:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const metrics = useMemo(() => ({
    boardCount: boards.length,
    productCount: products.length,
    payout: products.reduce((sum, product) => sum + (product.price || 0) * product.purchase_count, 0),
    views: products.reduce((sum, product) => sum + product.click_count, 0),
  }), [boards, products]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr_260px]">
        <aside className="space-y-2">
          <div className="mb-4 text-xs uppercase tracking-[0.18em] text-[#6B7280]">Vault control</div>
          <NavItem active label="Overview" />
          <NavItem label="My Boards" />
          <NavItem label="Inventory" />
          <NavItem label="Threads" badge="0 new" />
          <NavItem label="Payouts" />
          <NavItem label="Settings" />

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#6B7280]">My boards</div>
            {boards.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-sm text-[#6B7280]">No boards yet</div>
            ) : (
              boards.map((board) => (
                <div key={board.id} className="mt-2 rounded-2xl border border-white/10 bg-[#12121A] px-4 py-3 text-sm text-[#F0F0F5] first:mt-0">{board.title}</div>
              ))
            )}
            <Link href="/boards" className="mt-2 block rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-sm text-[#6B7280]">+ Create New Board</Link>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#F0F0F5] sm:text-4xl">Good morning, {loading ? '...' : displayName} 👋</h1>
              <p className="mt-2 text-sm text-[#9CA3AF]">Here&apos;s how your account is performing right now</p>
            </div>
            <div className="flex gap-2">
              <button className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]">View Vault →</button>
              <Link href="/keys/inventory/new" className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">+ Add Product</Link>
            </div>
          </div>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard icon={<FiDollarSign className="h-4 w-4" />} label="GMV This Week" value={`$${metrics.payout.toFixed(0)}`} delta="Fresh start" tone="gold" />
            <MetricCard icon={<FiBarChart2 className="h-4 w-4" />} label="Boards" value={String(metrics.boardCount)} delta="Create your first board" tone="green" />
            <MetricCard icon={<FiClock className="h-4 w-4" />} label="Card Views" value={String(metrics.views)} delta="No old stats loaded" tone="blue" />
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F0F0F5]">Your Boards</h2>
              <Link href="/boards" className="text-sm font-semibold text-[#D4AF37]">+ New Board</Link>
            </div>
            <div className="mt-4 space-y-3">
              {boards.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4 text-sm text-[#9CA3AF]">No boards yet. Create one to start fresh.</div>
              ) : (
                boards.map((board) => (
                  <div key={board.id} className="rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-semibold text-[#F0F0F5]">{board.title}</div>
                          <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold text-[#D4AF37]">{board.is_public ? 'Open' : 'Invite-only'}</span>
                        </div>
                        <div className="mt-1 text-sm text-[#9CA3AF]">{board.description || 'No description yet'} · 0 threads · 0 unanswered</div>
                      </div>
                      <div className="flex gap-4 text-sm font-semibold text-[#D4AF37]">
                        <button>Manage</button>
                        <button className="text-[#9CA3AF]">View Public</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F0F0F5]">Your Inventory</h2>
              <div className="text-sm text-[#9CA3AF]">{metrics.productCount} products · <Link href="/keys/inventory/new" className="font-semibold text-[#D4AF37]">+ Add Product</Link></div>
            </div>
            <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-[24px] border border-white/10">
              {products.length === 0 ? (
                <div className="bg-[#0A0A0F] p-4 text-sm text-[#9CA3AF]">No inventory yet. Add your first product when you&apos;re ready.</div>
              ) : (
                products.map((product, index) => (
                  <div key={product.id} className="flex items-center gap-4 bg-[#0A0A0F] p-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg text-white ${index % 3 === 0 ? 'bg-[linear-gradient(135deg,#1A1860,#2A3A6E)]' : index % 3 === 1 ? 'bg-[linear-gradient(135deg,#0A1A30,#1A3A5E)]' : 'bg-[linear-gradient(135deg,#2A1A0A,#4A3A1A)]'}`}>•</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#F0F0F5]">{product.name}</div>
                      <div className="text-xs text-[#9CA3AF]">{product.purchase_count} claims · {product.click_count} clicks</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-[#D4AF37]">{product.price ? `$${product.price}` : '$0'}</div>
                      <div className="text-xs text-[#6B7280]">{product.purchase_count} claims</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 text-sm font-semibold text-[#D4AF37]">+ Add New Unlock</div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-[32px] border border-[#D4AF37]/20 bg-[linear-gradient(135deg,rgba(18,18,26,1),rgba(212,175,55,0.08))] p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Available payout</div>
            <div className="mt-3 text-4xl font-semibold text-[#F0F0F5]">${metrics.payout.toFixed(2)}</div>
            <p className="mt-2 text-sm text-[#9CA3AF]">From your current inventory</p>
            <button className="mt-5 w-full rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">Transfer to bank →</button>
            <p className="mt-3 text-center text-xs text-[#6B7280]">Usually arrives in 1–2 days</p>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#12121A] p-6">
            <div className="text-lg font-semibold text-[#F0F0F5]">Recent Activity</div>
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4 text-sm text-[#C7CAD1]">
              <Activity text="No recent activity yet" time="now" dot="bg-[#D4AF37]" />
              <Activity text="Invite someone to start activity" time="now" dot="bg-[#3B82F6]" />
              <Activity text="Create a board to see updates here" time="now" dot="bg-[#10B981]" />
              <Activity text="Add a product to see claims" time="now" dot="bg-[#D4AF37]" />
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[#12121A] p-6">
            <div className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Vault health</div>
            <div className="mt-4 space-y-3 text-sm">
              <StatRow label="Boards" value={String(metrics.boardCount)} valueClassName="text-[#10B981]" />
              <StatRow label="Products" value={String(metrics.productCount)} valueClassName="text-[#F0F0F5]" />
              <StatRow label="Clicks" value={String(metrics.views)} valueClassName="text-[#D4AF37]" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function NavItem({ label, active = false, badge }: { label: string; active?: boolean; badge?: string }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${active ? 'bg-[#12121A] text-[#F0F0F5]' : 'text-[#9CA3AF]'}`}>
      <span>{label}</span>
      {badge ? <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-1 text-[10px] font-semibold text-[#D4AF37]">{badge}</span> : null}
    </div>
  );
}

function MetricCard({ icon, label, value, delta, tone }: { icon: React.ReactNode; label: string; value: string; delta: string; tone: 'gold' | 'green' | 'blue' }) {
  const accents = {
    gold: 'border-t-[#D4AF37]',
    green: 'border-t-[#10B981]',
    blue: 'border-t-[#3B82F6]',
  };

  return (
    <div className={`rounded-[24px] border border-white/10 border-t-2 ${accents[tone]} bg-[#0A0A0F] p-5`}>
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]">{icon}</div>
      <div className="mt-4 text-3xl font-semibold text-[#F0F0F5]">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">{label}</div>
      <div className={`mt-2 text-sm ${tone === 'gold' ? 'text-[#D4AF37]' : tone === 'green' ? 'text-[#10B981]' : 'text-[#3B82F6]'}`}>{delta}</div>
    </div>
  );
}

function Activity({ text, time, dot }: { text: string; time: string; dot: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <span className={`mt-2 h-2.5 w-2.5 rounded-full ${dot}`} />
      <div className="flex-1">
        <div>{text}</div>
      </div>
      <div className="text-xs text-[#6B7280]">{time}</div>
    </div>
  );
}

function StatRow({ label, value, valueClassName }: { label: string; value: string; valueClassName: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-[#9CA3AF]">{label}</span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}
