"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        setUser(user);
        setEmail(user.email || '');
      } catch (err: any) {
        console.error('Error loading user data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [router]);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete account');

      await supabase.auth.signOut({ scope: 'global' });
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/auth/login?deleted=true';
    } catch (err: any) {
      setError(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-[#9CA3AF]">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Account settings</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#F0F0F5]">Security and account controls</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#9CA3AF]">Update your password, review the email tied to your vault, or sign out and delete your account from the same dark control surface.</p>

        {error && <div className="mt-6 rounded-2xl border border-[#EF4444]/25 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">{error}</div>}
        {success && <div className="mt-6 rounded-2xl border border-[#10B981]/25 bg-[#10B981]/10 p-4 text-sm text-[#A7F3D0]">{success}</div>}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Email</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-sm text-[#F0F0F5] break-all">{email}</div>
            <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">This address is used for login and account recovery.</p>
          </div>

          <form onSubmit={handlePasswordChange} className="rounded-[28px] border border-white/10 bg-black/20 p-5 space-y-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">Change password</p>
            <Field label="New password" type="password" value={newPassword} onChange={setNewPassword} />
            <Field label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
            <button disabled={processing} className="inline-flex w-full items-center justify-center rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60">
              {processing ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ActionCard title="Sign out" description="Sign out from this device." actionLabel="Sign out" onClick={handleLogout} />
          <ActionCard title="Delete account" description="Permanently delete your account and all your data." actionLabel="Delete account" destructive onClick={() => setShowDeleteModal(true)} />
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
            <h2 className="text-2xl font-semibold text-[#F0F0F5]">Delete account</h2>
            <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">Type DELETE to permanently remove the account, boards, and associated data.</p>

            <input value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" placeholder="Type DELETE" />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-[#F0F0F5]">Cancel</button>
              <button disabled={deleting} onClick={handleDeleteAccount} className="flex-1 rounded-2xl bg-[#EF4444] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none" />
    </div>
  );
}

function ActionCard({ title, description, actionLabel, onClick, destructive = false }: { title: string; description: string; actionLabel: string; destructive?: boolean; onClick: () => void }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
      <div className="text-lg font-semibold text-[#F0F0F5]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{description}</p>
      <button onClick={onClick} className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${destructive ? 'bg-[#EF4444] text-white' : 'bg-white/[0.04] text-[#F0F0F5] border border-white/10'}`}>
        {actionLabel}
      </button>
    </div>
  );
}
