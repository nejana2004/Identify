"use client";

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { FiCheck, FiClock, FiGlobe, FiLock, FiShield, FiUsers, FiX } from 'react-icons/fi';

type BoardInvite = {
  id: string;
  board: {
    id: string;
    title: string;
    description: string | null;
    cover_image: string | null;
    user: {
      name: string;
      username: string;
      profile_photo: string | null;
    };
  };
  expires_at: string;
};

export default function JoinBoardPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { code } = resolvedParams;

  const [invite, setInvite] = useState<BoardInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadInvite() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const response = await fetch(`/api/boards/invite?code=${code}`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Invalid invite link');
        } else {
          setInvite(data.invite);
        }
      } catch {
        setError('Failed to load invite');
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [code]);

  const handleJoin = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/boards/join/${code}`);
      return;
    }

    setJoining(true);
    try {
      const response = await fetch('/api/boards/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept_invite', inviteCode: code, userId: user.id }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.pending) {
          setRequestPending(true);
        } else {
          setSuccess(true);
          setTimeout(() => router.push(`/boards/${data.boardId}`), 1600);
        }
      } else {
        setError(data.error || 'Failed to join board');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <CenterShell><Loader /></CenterShell>;
  }

  if (error) {
    return (
      <CenterShell>
        <InviteCard>
          <StatusIcon tone="error"><FiX className="h-8 w-8" /></StatusIcon>
          <h1 className="mt-4 text-2xl font-semibold text-[#F0F0F5]">Invalid invite</h1>
          <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{error}</p>
          <Link href="/explore" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">Explore boards</Link>
        </InviteCard>
      </CenterShell>
    );
  }

  if (requestPending) {
    return (
      <CenterShell>
        <InviteCard>
          <StatusIcon tone="pending"><FiClock className="h-8 w-8" /></StatusIcon>
          <h1 className="mt-4 text-2xl font-semibold text-[#F0F0F5]">Request sent</h1>
          <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Your request to join {invite?.board.title} is waiting for the curator to approve it.</p>
          <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#D4AF37]">You’ll be notified when they respond</p>
          <Link href="/explore" className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-[#F0F0F5]">Continue exploring</Link>
        </InviteCard>
      </CenterShell>
    );
  }

  if (success) {
    return (
      <CenterShell>
        <InviteCard>
          <StatusIcon tone="success"><FiCheck className="h-8 w-8" /></StatusIcon>
          <h1 className="mt-4 text-2xl font-semibold text-[#F0F0F5]">You’re in</h1>
          <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">You joined {invite?.board.title}. Redirecting to the board now.</p>
        </InviteCard>
      </CenterShell>
    );
  }

  return (
    <CenterShell>
      <InviteCard wide>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#D4AF37]"><FiLock className="h-4 w-4" /> Board invite</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#F0F0F5]">{invite?.board.title}</h1>
            <p className="mt-3 text-sm leading-7 text-[#9CA3AF]">{invite?.board.description || 'A private board for useful posts, cards, and trust signals.'}</p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs text-[#9CA3AF]">
              <Pill icon={<FiGlobe className="h-4 w-4" />}>Invite-only access</Pill>
              <Pill icon={<FiUsers className="h-4 w-4" />}>Join requests reviewed by the curator</Pill>
              <Pill icon={<FiShield className="h-4 w-4" />}>Trust signals visible on the board</Pill>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Invited by</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">
                  {invite?.board.user.profile_photo ? (
                    <Image src={invite.board.user.profile_photo} alt={invite.board.user.name} width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    <FiUsers className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="font-semibold text-[#F0F0F5]">{invite?.board.user.name}</div>
                  <div className="text-sm text-[#9CA3AF]">@{invite?.board.user.username}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={handleJoin} disabled={joining} className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
                {joining ? 'Joining...' : user ? 'Join board' : 'Sign in to join'}
              </button>
              <Link href="/explore" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-[#F0F0F5]">Maybe later</Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0A0A0F]">
            <div className="h-52 bg-[linear-gradient(135deg,rgba(212,175,55,0.18),rgba(26,26,36,0.95))]">
              {invite?.board.cover_image ? (
                <Image src={invite.board.cover_image} alt={invite.board.title} width={900} height={420} className="h-full w-full object-cover opacity-90" />
              ) : null}
            </div>
            <div className="space-y-4 p-5">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">Preview</div>
                <div className="mt-2 text-xl font-semibold text-[#F0F0F5]">What you’ll find inside</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile title="Threads" text="Questions, answers, and recommendations." />
                <InfoTile title="Cards" text="Structured items with reasons and links." />
                <InfoTile title="Members" text="Visible people and contributors." />
                <InfoTile title="Trust" text="Saved, viewed, and verified signals." />
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-[#9CA3AF]">
                Invite expires on {new Date(invite?.expires_at || '').toLocaleDateString()}.
              </div>
            </div>
          </div>
        </div>
      </InviteCard>
    </CenterShell>
  );
}

function CenterShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">{children}</div></div>;
}

function InviteCard({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`w-full rounded-[28px] border border-white/10 bg-[#12121A] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] ${wide ? 'max-w-none' : 'max-w-2xl'}`}>{children}</div>;
}

function StatusIcon({ tone, children }: { tone: 'success' | 'pending' | 'error'; children: React.ReactNode }) {
  const toneClass = tone === 'success' ? 'bg-[#10B981]/15 text-[#10B981]' : tone === 'pending' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'bg-[#EF4444]/15 text-[#EF4444]';
  return <div className={`flex h-16 w-16 items-center justify-center rounded-full ${toneClass}`}>{children}</div>;
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{icon}{children}</span>;
}

function InfoTile({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-[#12121A] p-4"><div className="text-sm font-semibold text-[#F0F0F5]">{title}</div><p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{text}</p></div>;
}

function Loader() {
  return <div className="h-14 w-14 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />;
}