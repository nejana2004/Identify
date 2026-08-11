"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { saveOnboarding } from '@/lib/onboarding';
import { useRouter } from 'next/navigation';
import { FiArrowRight, FiCheck, FiGlobe, FiHash, FiSearch, FiStar, FiUser } from 'react-icons/fi';

const roles = [
  { id: 'expert', title: 'I have expertise to share', description: 'Engineers, designers, consultants, specialists.' },
  { id: 'reviewer', title: 'I love reviewing products, places & services', description: 'Honest opinions from real experience.' },
  { id: 'seeker', title: 'I am here to learn and discover', description: 'Find trusted recommendations and answers.' },
  { id: 'all', title: 'All of the above', description: 'Share, review, and discover.' },
];

const topics = ['Software Engineering', 'Design & UI', 'DevOps & Cloud', 'Productivity', 'Food & Dining', 'Travel', 'Finance', 'Home & Living'];
const templates = [
  'Ask Me Anything About [Topic]',
  'Products I Recommend in [Category]',
  'Best Places in [Location]',
  'My [Workflow] Toolkit',
  'Start from Scratch',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['DevOps & Cloud', 'Productivity', 'Software Engineering']);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      setUser(session.user);

      const { data: profile } = await supabase.from('users').select('username, name, bio, onboarded_at').eq('id', session.user.id).maybeSingle();
      if (profile?.onboarded_at) {
        router.push('/discover');
        return;
      }

      setUsername(profile?.username || '');
      setName(profile?.name || '');
      setBio(profile?.bio || '');
    }

    checkAuth();
  }, [router]);

  const selectedTopicCount = useMemo(() => selectedTopics.length, [selectedTopics]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) => (prev.includes(topic) ? prev.filter((item) => item !== topic) : [...prev, topic]));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
      if (!name.trim()) { setError('Name is required'); setLoading(false); return; }

      const { error: saveError } = await saveOnboarding({
        userId: user.id,
        username: username.trim(),
        name: name.trim(),
        bio: bio.trim(),
        country: 'Other',
        tagsCreated: selectedTopics,
        tagsLiked: [selectedRole, selectedTemplate],
      });

      if (saveError) throw saveError;

      router.push('/discover');
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to save onboarding');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="min-h-[60vh] flex items-center justify-center text-[#9CA3AF]">Loading onboarding...</div>;
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-[#12121A] shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="space-y-6 border-b border-white/10 bg-[linear-gradient(180deg,rgba(212,175,55,0.16),rgba(10,10,15,0.96))] p-6 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
              <FiStar className="h-3.5 w-3.5" /> Board-first onboarding
            </div>
            <h1 className="max-w-md text-4xl font-semibold tracking-tight text-[#F0F0F5]">What brings you to Identify?</h1>
            <p className="max-w-xl text-sm leading-7 text-[#C7CAD1]">Pick a role, choose your topics, and create your first board template. You can change everything later.</p>

            <div className="grid gap-3">
              {[1, 2, 3].map((number) => (
                <div key={number} className={`rounded-2xl border px-4 py-3 ${step === number ? 'border-[#D4AF37]/35 bg-[#D4AF37]/10' : 'border-white/10 bg-black/20'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${step === number ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'bg-white/5 text-[#F0F0F5]'}`}>{number}</div>
                    <div>
                      <div className="text-sm font-semibold text-[#F0F0F5]">{number === 1 ? 'Who are you?' : number === 2 ? 'Pick your topics' : 'Create your first board'}</div>
                      <div className="text-xs text-[#9CA3AF]">{number === 1 ? 'Role selection' : number === 2 ? 'Interest discovery' : 'Template selection'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
            {step === 1 && (
              <div className="space-y-4">
                <StepTitle eyebrow="Step 1" title="Who are you?" subtitle="Pick one to get started. You can do everything later." icon={<FiUser className="h-5 w-5" />} />
                <div className="grid gap-3">
                  {roles.map((role) => (
                    <button key={role.id} type="button" onClick={() => setSelectedRole(role.id)} className={`rounded-[24px] border p-5 text-left transition ${selectedRole === role.id ? 'border-[#D4AF37]/35 bg-[#D4AF37]/10' : 'border-white/10 bg-[#0A0A0F] hover:bg-white/[0.04]'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-[#F0F0F5]">{role.title}</div>
                          <p className="mt-1 text-sm leading-6 text-[#9CA3AF]">{role.description}</p>
                        </div>
                        {selectedRole === role.id && <FiCheck className="h-5 w-5 text-[#D4AF37]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <StepTitle eyebrow="Step 2" title="What topics do you know or care about?" subtitle="Select at least 3 so people can find your boards." icon={<FiHash className="h-5 w-5" />} />
                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3">
                  <FiSearch className="h-5 w-5 text-[#9CA3AF]" />
                  <input className="w-full bg-transparent text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" placeholder="Search topics..." />
                </label>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button key={topic} type="button" onClick={() => toggleTopic(topic)} className={`rounded-full px-4 py-2 text-sm transition ${selectedTopics.includes(topic) ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-black/20 text-[#F0F0F5]'}`}>
                      {topic}
                    </button>
                  ))}
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[#9CA3AF]">{selectedTopicCount} topics selected</div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <StepTitle eyebrow="Step 3" title="Let’s create your first board" subtitle="Pick a template and make the board feel intentional from the start." icon={<FiGlobe className="h-5 w-5" />} />
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <button key={template} type="button" onClick={() => setSelectedTemplate(template)} className={`rounded-[24px] border p-5 text-left transition ${selectedTemplate === template ? 'border-[#D4AF37]/35 bg-[#D4AF37]/10' : 'border-white/10 bg-[#0A0A0F] hover:bg-white/[0.04]'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-[#F0F0F5]">{template}</div>
                          <p className="mt-1 text-sm text-[#9CA3AF]">A one-click starting point for your board.</p>
                        </div>
                        {selectedTemplate === template && <FiCheck className="h-5 w-5 text-[#D4AF37]" />}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Username" value={username} onChange={setUsername} placeholder="your_handle" />
                  <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">Bio</label>
                  <textarea value={bio} onChange={(event) => setBio(event.target.value)} className="min-h-28 w-full rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" placeholder="Tell people what you know best." />
                </div>
              </div>
            )}

            {error && <div className="rounded-2xl border border-[#EF4444]/25 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-[#F0F0F5]" disabled={step === 1}>
                Back
              </button>
              {step < 3 ? (
                <button type="button" onClick={() => setStep((current) => Math.min(3, current + 1))} className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0A0A0F]">
                  Continue <FiArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={loading} className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60">
                  {loading ? 'Saving...' : 'Finish setup'} <FiArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ eyebrow, title, subtitle, icon }: { eyebrow: string; title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">{icon}{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F0F0F5]">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[#9CA3AF]">{subtitle}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" placeholder={placeholder} />
    </div>
  );
}