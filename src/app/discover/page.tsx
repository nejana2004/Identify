import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';

const boards = [
  {
    title: 'Your first board',
    handle: '@yourname',
    topic: 'Topic space',
    access: 'Open Board',
    summary: 'Create a board for questions, answers, and cards.',
    stats: ['0 Insiders', '0 Answers', '0 Products'],
  },
  {
    title: 'Invite-only board',
    handle: '@yourname',
    topic: 'Private space',
    access: 'Open Board',
    summary: 'Keep a private space for people you explicitly invite.',
    stats: ['0 Insiders', '0 Reviews', '0 Areas'],
  },
];

const trending = [
  {
    title: 'Start your first discussion',
    author: '@yourname answered · Your first board',
    meta: ['Saved 0 times', '0 cards attached', '0 replies', '0 views'],
  },
  {
    title: 'Add a card to your next post',
    author: '@yourname · Your first board',
    meta: ['Saved 0 times', '0 cards attached', '0 replies'],
  },
  {
    title: 'Invite your first member',
    author: '@yourname · Invite-only board',
    meta: ['Saved 0 times', '0 cards attached'],
  },
];

export default function DiscoverPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 max-w-2xl rounded-full border border-white/10 bg-[#12121A] px-5 py-3 text-sm text-[#9CA3AF]">
        Search boards, threads, products, people...
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {['All', 'Software Engineering', 'Design & UI', 'DevOps & Cloud', 'Audio & Music', 'Finance', 'Fitness', 'Food & Dining', 'Photography', 'Travel'].map((topic, index) => (
          <span key={topic} className={`rounded-full px-4 py-2 text-sm ${index === 0 ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-black/20 text-[#F0F0F5]'}`}>
            {topic}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Featured boards</p>
          <div className="space-y-4">
            {boards.map((board, index) => (
              <article key={board.title} className="overflow-hidden rounded-[28px] border border-white/10 bg-[#12121A] shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
                <div className={`relative h-[100px] ${index === 0 ? 'bg-[linear-gradient(135deg,#1A0A3E,#2A1860)]' : 'bg-[linear-gradient(135deg,#0A1A18,#1A3A28)]'}`}>
                  <div className="absolute inset-0 flex items-end justify-between gap-4 bg-[linear-gradient(to_bottom,transparent,rgba(5,5,8,0.7))] px-5 py-4">
                    <div>
                      <div className="text-sm text-[#C7CAD1]">{board.topic}</div>
                      <div className="text-2xl font-semibold text-[#F0F0F5]">{board.title}</div>
                      <div className="text-sm text-[#C7CAD1]">{board.handle}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${board.access === 'Open Board' ? 'border border-[#10B981]/20 bg-[#10B981]/10 text-[#10B981]' : 'border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                      {board.access}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <p className="mb-4 text-sm leading-6 text-[#9CA3AF]">{board.summary}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-4 text-sm text-[#9CA3AF]">
                      {board.stats.map((stat) => <span key={stat}>{stat}</span>)}
                    </div>
                    <button className={`rounded-full px-4 py-2 text-sm font-semibold ${board.access === 'Open Board' ? 'border border-white/10 bg-white/[0.03] text-[#F0F0F5]' : 'bg-[#D4AF37] text-[#0A0A0F]'}`}>
                      {board.access === 'Open Board' ? 'Join Free' : 'Request Access'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <p className="mb-4 mt-8 text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Trending by saves this week</p>
          <div className="space-y-3">
            {trending.map((thread, index) => (
              <article key={thread.title} className={`rounded-[24px] border border-white/10 bg-[#12121A] p-5 ${index === 1 ? 'border-l-4 border-l-[#10B981]' : index === 2 ? 'border-l-4 border-l-[#3B82F6]' : ''}`}>
                <div className="text-lg font-semibold text-[#F0F0F5]">{thread.title}</div>
                <div className="mt-2 text-sm text-[#9CA3AF]">{thread.author}</div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#9CA3AF]">
                  {thread.meta.map((item) => <span key={item}>{item}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Top reviewers this week</p>
            <div className="space-y-4">
              {[
                ['YO', '@yourname', '0 saves this week'],
                ['MB', '@member_one', '0 saves this week'],
                ['PB', '@profile_two', '0 saves this week'],
                ['CB', '@creator_three', '0 saves this week'],
              ].map(([initial, handle, meta], index) => (
                <div key={handle} className="flex items-center gap-3 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${index === 0 ? 'border-2 border-[#D4AF37] bg-[#6C5CE7]' : index === 1 ? 'bg-[#10B981]' : index === 2 ? 'bg-[#F43F5E]' : 'bg-[#F97316]'} text-sm font-semibold text-white`}>
                    {initial}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#F0F0F5]">{handle}</div>
                    <div className="text-xs text-[#9CA3AF]">{meta}</div>
                  </div>
                  {index === 0 && <span className="rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-1 text-[10px] font-semibold text-[#D4AF37]">#1</span>}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#12121A] p-5">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-[#D4AF37]">New boards</p>
            <div className="space-y-4 text-sm text-[#9CA3AF]">
              <div className="border-b border-white/10 pb-3">
                <div className="font-semibold text-[#F0F0F5]">Create your first board</div>
                <div>@yourname · 0 reviews · Open</div>
              </div>
              <div className="border-b border-white/10 pb-3">
                <div className="font-semibold text-[#F0F0F5]">Invite-only space</div>
                <div>@yourname · 0 threads · Invite</div>
              </div>
              <div>
                <div className="font-semibold text-[#F0F0F5]">A paid board</div>
                <div>@yourname · 0 reviews · Open</div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#D4AF37]/20 bg-[linear-gradient(135deg,var(--vault-surface),rgba(212,175,55,0.04))] p-5">
            <div className="text-base font-semibold text-[#F0F0F5]">Start your own vault</div>
            <p className="mt-2 text-sm text-[#9CA3AF]">Share what you know. Earn when it helps.</p>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
              Create Board <FiArrowRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}