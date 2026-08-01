"use client";

import Link from 'next/link';
import { FiArrowRight, FiSearch, FiUsers, FiHash, FiStar, FiGlobe, FiShield } from 'react-icons/fi';

const filters = ['All', 'Boards', 'Threads', 'Products', 'People', 'Places'];
const sorts = ['Relevance', 'Most Saved', 'Most Recent', 'Top This Month'];

export default function SearchPage() {
	return (
		<div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="rounded-[28px] border border-white/10 bg-[#12121A] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
				<div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0A0A0F] px-4 py-3">
					<FiSearch className="h-5 w-5 text-[#9CA3AF]" />
					<span className="text-sm text-[#6B7280]">Search boards, threads, products, people...</span>
				</div>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
				<span className="text-[#9CA3AF]">Filters:</span>
				{filters.map((filter, index) => (
					<button key={filter} className={`rounded-full px-4 py-2 ${index === 0 ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-black/20 text-[#F0F0F5]'}`}>{filter}</button>
				))}
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
				<span className="text-[#9CA3AF]">Sort by:</span>
				{sorts.map((sort, index) => (
					<button key={sort} className={`rounded-full px-4 py-2 ${index === 0 ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-black/20 text-[#F0F0F5]'}`}>{sort}</button>
				))}
			</div>

			<div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
				<main className="space-y-8">
					<section className="space-y-4">
						<h1 className="text-3xl font-semibold text-[#F0F0F5]">Search your fresh workspace</h1>
						<div className="grid gap-4">
							<SearchResultCard title="No old results loaded" subtitle="Create boards and posts to populate search" meta="No demo data · No old owners · Start fresh" tone="purple" />
							<SearchResultCard title="Create your first thread" subtitle="Thread · Your board · Draft" meta="0 saves · 0 replies · 0 cards" tone="blue" />
							<SearchResultCard title="Add a card when ready" subtitle="Product card · Manual" meta="$0 · 0 claims · 0 saves" tone="gold" />
						</div>
					</section>
				</main>

				<aside className="space-y-4">
					<section className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
						<div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Top reviewers</div>
						<div className="mt-4 space-y-3">
							{['@yourname', '@member_one', '@member_two', '@member_three'].map((name, index) => (
								<div key={name} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
									<div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${index === 0 ? 'bg-[#6C5CE7]' : index === 1 ? 'bg-[#10B981]' : index === 2 ? 'bg-[#F43F5E]' : 'bg-[#F97316]'}`}>{name.slice(1, 3).toUpperCase()}</div>
									<div>
										<div className="text-sm font-semibold text-[#F0F0F5]">{name}</div>
										<div className="text-xs text-[#9CA3AF]">Trusted reviewer</div>
									</div>
								</div>
							))}
						</div>
					</section>

					<section className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
						<div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Categories</div>
						<div className="mt-4 flex flex-wrap gap-2">
							{['Your boards', 'Your threads', 'Your products', 'Your people'].map((item) => (
								<span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm text-[#F0F0F5]">{item}</span>
							))}
						</div>
					</section>
				</aside>
			</div>
		</div>
	);
}

function SearchResultCard({ title, subtitle, meta, tone }: { title: string; subtitle: string; meta: string; tone: 'purple' | 'blue' | 'gold' }) {
	const accents = {
		purple: 'border-l-[#6C5CE7]',
		blue: 'border-l-[#3B82F6]',
		gold: 'border-l-[#D4AF37]',
	};

	return (
		<article className={`rounded-[28px] border border-white/10 border-l-4 ${accents[tone]} bg-[#12121A] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.24)]`}>
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="text-2xl font-semibold text-[#F0F0F5]">{title}</div>
					<div className="mt-2 text-sm text-[#9CA3AF]">{subtitle}</div>
					<div className="mt-3 text-sm text-[#9CA3AF]">{meta}</div>
				</div>
				<Link href="/discover" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-[#F0F0F5]">
					Open <FiArrowRight className="h-4 w-4" />
				</Link>
			</div>
		</article>
	);
}
