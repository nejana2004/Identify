import Link from 'next/link';
import { FiArrowRight, FiBookmark, FiBookOpen, FiGlobe, FiMapPin, FiMonitor, FiShoppingBag, FiTool } from 'react-icons/fi';

const examples = [
  'My Favorite Cafes in Colombo',
  'Tools I Use Every Day',
  'My Freelance Designer Toolkit',
  'Books That Changed How I Think',
  'Best Products Under LKR 10,000',
  'Resources for Learning UI Design',
  'Services I Trust',
  'My Beginner’s Guide to Product Design',
];

const shareTypes = [
  ['Products', 'Things you use and would recommend.', FiShoppingBag],
  ['Places', 'Cafes, restaurants, destinations, and local favorites.', FiMapPin],
  ['Books and courses', 'Resources that helped you learn or grow.', FiBookOpen],
  ['Apps and tools', 'Software and websites that make life or work easier.', FiMonitor],
  ['Services', 'People and businesses you trust.', FiTool],
  ['Knowledge', 'Advice, frameworks, guides, experiences, and useful explanations.', FiGlobe],
] as const;

const howItWorks = [
  'Create a page',
  'Add useful recommendations',
  'Explain your choices',
  'Share one link',
  'Keep improving it',
];

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <div className="inline-flex rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#D4AF37]">
            A better home for useful knowledge
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-[#F0F0F5] sm:text-5xl lg:text-6xl">
            Turn what you know into something useful.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#A4A7B0]">
            Create one simple page for the products, places, books, tools, services, links, and resources you recommend. Write why they matter, organize everything in one place, and share one useful link with anyone.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-black">
              Create your free page <FiArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/discover" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#F0F0F5]">
              Explore recommendations
            </Link>
          </div>
          <p className="mt-4 text-sm text-[#6B7280]">No videos. No daily posting. No need to become an influencer.</p>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-[#121212] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
          <div className="rounded-[16px] border border-white/10 bg-[#0B0B0B] p-5">
            <div className="text-sm text-[#D4AF37]">Example recommendation</div>
            <h2 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">Product: Notion</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#A4A7B0]">
              <p><span className="font-semibold text-[#F0F0F5]">What it is:</span> A flexible workspace for notes, projects, documents, and personal organization.</p>
              <p><span className="font-semibold text-[#F0F0F5]">Why I recommend it:</span> It helps freelancers keep their projects, notes, and client information in one place.</p>
              <p><span className="font-semibold text-[#F0F0F5]">Best for:</span> People who like flexible systems and want to create their own workspace.</p>
              <p><span className="font-semibold text-[#F0F0F5]">What to consider:</span> It can become complicated if you add too many templates and systems.</p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button className="inline-flex items-center rounded-full bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black">Visit resource</button>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#F0F0F5]"><FiBookmark className="h-4 w-4" /> Save</button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[18px] border border-white/10 bg-[#121212] p-5">
          <h2 className="text-2xl font-semibold text-[#F0F0F5]">What is Identify?</h2>
          <p className="mt-3 text-sm leading-7 text-[#A4A7B0]">
            Identify is a place to share practical knowledge and trusted recommendations. Explain why you recommend something so people can make better decisions.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-[#D6D8DF] sm:grid-cols-2">
            {[
              'Products you love.',
              'Cafes and places you visit.',
              'Books and courses that helped you.',
              'Apps and tools you use.',
              'Services you trust.',
              'Websites and resources.',
              'Guides, checklists, and useful links.',
            ].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-[#0B0B0B] px-4 py-3">{item}</div>)}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-[#121212] p-5">
          <h2 className="text-2xl font-semibold text-[#F0F0F5]">Your recommendations, all in one place</h2>
          <p className="mt-3 text-sm leading-7 text-[#A4A7B0]">
            Instead of sending separate messages, links, screenshots, and files, create one page people can return to.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-[#D6D8DF]">
            {examples.map((item) => <div key={item} className="rounded-xl border border-white/10 bg-[#0B0B0B] px-4 py-3">{item}</div>)}
          </div>
          <Link href="/auth/signup" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">Create your first page <FiArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="rounded-[18px] border border-white/10 bg-[#121212] p-5">
        <h2 className="text-2xl font-semibold text-[#F0F0F5]">More than a list of links</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ['What it is', 'Tell people what the product, place, book, tool, or service does.'],
            ['Why you recommend it', 'Share your personal experience and what makes it useful.'],
            ['Who it is for', 'Help people understand whether it fits their situation.'],
            ['What to consider', 'Add pros, cons, alternatives, price, location, or other details.'],
            ['The link', 'Send people directly to the website, map, booking page, or resource.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border border-white/10 bg-[#0B0B0B] p-4">
              <div className="text-sm font-semibold text-[#F0F0F5]">{title}</div>
              <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[18px] border border-white/10 bg-[#121212] p-5">
          <h2 className="text-2xl font-semibold text-[#F0F0F5]">How it works</h2>
          <div className="mt-5 space-y-3">
            {howItWorks.map((step, index) => (
              <div key={step} className="rounded-xl border border-white/10 bg-[#0B0B0B] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">0{index + 1}</div>
                <div className="mt-2 text-lg font-semibold text-[#F0F0F5]">{step}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-[#121212] p-5">
          <h2 className="text-2xl font-semibold text-[#F0F0F5]">What can you share?</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shareTypes.map(([title, text, Icon]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-[#0B0B0B] p-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-[#D4AF37]"><Icon className="h-4 w-4" /></div>
                <div className="mt-3 text-sm font-semibold text-[#F0F0F5]">{title}</div>
                <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[18px] border border-white/10 bg-[#121212] p-5">
          <h2 className="text-2xl font-semibold text-[#F0F0F5]">For people with useful knowledge</h2>
          <p className="mt-3 text-sm leading-7 text-[#A4A7B0]">You do not need to become an influencer to share something valuable. Identify gives you one simple place to organize and share it.</p>
          <Link href="/auth/signup" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">Create your resource page <FiArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-[#121212] p-5">
          <h2 className="text-2xl font-semibold text-[#F0F0F5]">For people looking for better recommendations</h2>
          <p className="mt-3 text-sm leading-7 text-[#A4A7B0]">Find useful advice from people with real experience. See the reasoning behind each recommendation, not just a random link or rating.</p>
          <Link href="/discover" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37]">Explore useful pages <FiArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <section className="rounded-[18px] border border-white/10 bg-[#121212] p-5">
        <h2 className="text-2xl font-semibold text-[#F0F0F5]">Built for useful knowledge, not performance</h2>
        <div className="mt-5 grid gap-2 text-sm text-[#D6D8DF] sm:grid-cols-2 lg:grid-cols-3">
          {[
            'One link instead of scattered recommendations.',
            'Practical explanations instead of unexplained links.',
            'Organized resources instead of disappearing posts.',
            'Real experiences instead of empty ratings.',
            'Useful pages instead of endless scrolling.',
            'A place to share knowledge without performing.',
          ].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-[#0B0B0B] px-4 py-3">{item}</div>)}
        </div>
      </section>

      <section className="rounded-[18px] border border-[#D4AF37]/20 bg-[linear-gradient(135deg,rgba(18,18,26,1),rgba(212,175,55,0.06))] p-6 text-center">
        <h2 className="text-3xl font-semibold text-[#F0F0F5]">Share what you know. Organize what you recommend.</h2>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-[#A4A7B0]">Create one useful page for your products, places, books, tools, services, links, and resources.</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-black">Create your free page <FiArrowRight className="h-4 w-4" /></Link>
          <Link href="/discover" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#F0F0F5]">Explore recommendations</Link>
        </div>
      </section>
    </div>
  );
}
