import Link from 'next/link';
import { FiArrowRight, FiBookOpen, FiGlobe, FiLock, FiSearch, FiShield, FiStar, FiUsers } from 'react-icons/fi';

const featuredBoards = [
  {
    title: 'Your first board',
    handle: '@yourname',
    topic: 'Topic space',
    access: 'Open board',
    summary: 'Questions, answers, configs, and tools for your own board.',
    stats: '0 members · 0 posts · 0 cards',
  },
  {
    title: 'Invite-only board',
    handle: '@yourname',
    topic: 'Private board',
    access: 'Invite-only',
    summary: 'Keep work private while you invite people you trust.',
    stats: '0 members · 0 posts · 0 cards',
  },
  {
    title: 'A paid board',
    handle: '@yourname',
    topic: 'Premium access',
    access: 'Open board',
    summary: 'Charge for access once the content is worth paying for.',
    stats: '0 followers · 0 posts · 0 cards',
  },
];

const trustSignals = [
  { label: 'Save counts', description: 'Surface what people keep returning to.', icon: FiStar },
  { label: 'Card clicks', description: 'See which recommendations actually get action.', icon: FiArrowRight },
  { label: 'Board members', description: 'Track topic loyalty without a noisy feed.', icon: FiUsers },
  { label: 'Verified owner', description: 'Give credibility to recommendations people can trust.', icon: FiShield },
];

const coreLoop = [
  { title: 'Create a board', description: 'Set up your vault in minutes. Choose open, invite-only, or paid. No setup fees.' },
  { title: 'Answer questions', description: 'People drop questions. You answer with your expertise. Threads become permanent assets.' },
  { title: 'Attach cards with /', description: 'Type / to embed any product, tool, or file into your answer. Context meets commerce.' },
  { title: 'Earn trust & money', description: 'Every claim can earn revenue. No commissions to platforms. No algorithm to chase.' },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.16),transparent_28%),radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.1),transparent_22%),linear-gradient(180deg,rgba(10,10,15,0)_0%,rgba(5,5,8,0.65)_100%)]" />

      <main className="relative mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-white/[0.03] px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-[#D4AF37]">
              The Knowledge Economy&apos;s Commerce Platform
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[#F0F0F5] sm:text-5xl lg:text-6xl">
                Share what you know.<br />
                <span className="text-[#D4AF37]">Get paid when it helps.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#9CA3AF] sm:text-xl">
                Answer questions. Attach what you trust. Earn every time someone finds it useful. No algorithms. No performance required.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/discover" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-[#0A0A0F] transition hover:translate-y-[-1px] hover:bg-[#F0C94A] hover:shadow-[0_0_40px_rgba(212,175,55,0.22)]">
                Start Your Vault - Free
                <FiArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/discover" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#F0F0F5] transition hover:border-[#D4AF37]/30 hover:bg-white/[0.06]">
                Explore boards
                <FiSearch className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Boards', 'Create topic spaces for expertise and recommendations.'],
                ['Posts', 'Questions, answers, reviews, and threaded replies.'],
                ['Cards', 'Structured product, place, service, or file recommendations.'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-[#12121A]/90 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur">
                  <div className="text-base font-semibold text-[#F0F0F5]">{title}</div>
                  <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0A0A0F]/95 p-4 shadow-[0_25px_100px_rgba(0,0,0,0.45)]">
            <div className="rounded-[22px] border border-white/10 bg-[#12121A] p-5">
              <div className="flex items-center justify-between text-sm text-[#9CA3AF]">
                <span>Board preview</span>
                <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[#D4AF37]">Open board</span>
              </div>
              <div className="mt-5 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(212,175,55,0.2),rgba(18,18,26,0.98))] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#D4AF37]">Tech & tools</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Your first board</h2>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-[#C7CAD1]">@yourname · Build a board around what you know best.</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/10 p-3 text-[#F0F0F5]">
                    <FiBookOpen className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                      ['0', 'members'],
                      ['0', 'posts'],
                      ['0', 'cards'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="text-2xl font-semibold text-[#F0F0F5]">{value}</div>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#9CA3AF]">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-[#0A0A0F] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[#F0F0F5]">Your first recommendation</p>
                      <p className="mt-1 text-sm text-[#9CA3AF]">One structured card can sit inside a post, answer, or review.</p>
                    </div>
                    <span className="rounded-full bg-[#10B981]/15 px-3 py-1 text-xs font-semibold text-[#10B981]">Verified owner</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#D4AF37]/25 bg-[#12121A] px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-[#F0F0F5]">Your first card</div>
                      <div className="text-sm text-[#9CA3AF]">$0 · 0 saves · 0 clicks</div>
                    </div>
                    <button className="rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-[#0A0A0F]">Claim</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-4">
          {coreLoop.map((item, index) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-[#12121A]/95 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.26)]">
              <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">0{index + 1}</div>
              <h3 className="mt-3 text-lg font-semibold text-[#F0F0F5]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Featured boards</p>
              <h2 className="mt-2 text-3xl font-semibold text-[#F0F0F5]">Boards that feel searchable, specific, and useful</h2>
            </div>
            <Link href="/discover" className="hidden text-sm font-medium text-[#D4AF37] hover:text-[#F0C94A] md:inline-flex">
              View boards
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {featuredBoards.map((board) => (
              <article key={board.title} className="group rounded-[28px] border border-white/10 bg-[#12121A] p-4 transition hover:-translate-y-1 hover:border-[#D4AF37]/30 hover:shadow-[0_24px_90px_rgba(0,0,0,0.38)]">
                <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(34,34,48,0.8))] p-5">
                  <div className="flex items-center justify-between text-sm text-[#C7CAD1]">
                    <span>{board.topic}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-[#F0F0F5]">
                      {board.access === 'Invite-only' ? <FiLock className="h-3.5 w-3.5 text-[#D4AF37]" /> : <FiGlobe className="h-3.5 w-3.5 text-[#10B981]" />}
                      {board.access}
                    </span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-[#F0F0F5]">{board.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#C7CAD1]">{board.summary}</p>
                  <p className="mt-4 text-sm text-[#9CA3AF]">{board.handle}</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 text-sm text-[#9CA3AF]">
                  <span>{board.stats}</span>
                  <FiArrowRight className="h-4 w-4 text-[#D4AF37] transition group-hover:translate-x-1" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#12121A] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Trust system</p>
            <h2 className="mt-3 text-3xl font-semibold text-[#F0F0F5]">Make reputation visible, not popularity.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#9CA3AF]">
              The platform highlights saves, clicks, followers, and verified owner signals so quality can compound without a feed or ranking gimmick.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {trustSignals.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-[#F0F0F5]">{item.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0A0A0F] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Surface map</p>
                <h2 className="mt-3 text-2xl font-semibold text-[#F0F0F5]">Everything the MVP needs</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-[#9CA3AF]">Search-first</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'User accounts & profiles',
                'Boards with public or invite-only access',
                'Posts for questions, answers, reviews, and recommendations',
                'Structured cards with a short why note',
                'Search by topic, board, person, or card type',
                'Basic storefront and moderation basics',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-[#12121A] px-4 py-4 text-sm leading-6 text-[#F0F0F5]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}