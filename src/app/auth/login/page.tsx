"use client";
import { useState } from "react";
import { signInWithEmail } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signInWithEmail(email, password);
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setLoading(false);
    // Use window.location for a full page refresh to load profile properly
    window.location.href = "/discover";
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-0 overflow-hidden rounded-[32px] border border-white/10 bg-[#12121A] shadow-[0_30px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="space-y-6 border-b border-white/10 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(10,10,15,0.96))] p-6 lg:border-b-0 lg:border-r lg:border-white/10 lg:p-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D4AF37] text-[#0A0A0F] font-bold">I</div>
            <span className="text-2xl font-bold text-[#F0F0F5]">Identify</span>
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">
            The Knowledge Economy&apos;s Commerce Platform
          </div>
          <h1 className="max-w-md text-4xl font-semibold tracking-tight text-[#F0F0F5]">Welcome back</h1>
          <p className="max-w-xl text-sm leading-7 text-[#C7CAD1]">Sign in to continue building boards, publishing threads, and attaching cards with clear reasoning.</p>
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-[#9CA3AF]">
            No feed. No algorithm. Just boards, posts, cards, search, and trust.
          </div>
        </aside>

        <div className="space-y-6 p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">Email address</label>
              <input id="email" type="email" autoComplete="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" required />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">Password</label>
              <input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" required />
            </div>

            {error && <div className="rounded-2xl border border-[#EF4444]/25 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">{error}</div>}

            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"} <FiArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="text-center text-sm text-[#9CA3AF]">
            Don&apos;t have an account? <Link href="/auth/signup" className="font-semibold text-[#D4AF37] hover:text-[#F0C94A]">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
