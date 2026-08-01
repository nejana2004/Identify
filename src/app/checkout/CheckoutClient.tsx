"use client";

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiCheck, FiLock, FiX } from 'react-icons/fi';

export default function CheckoutClient() {
  const params = useSearchParams();
  const title = params.get('title') || 'Unlock This Vault';
  const price = params.get('price') || '29';
  const [paid, setPaid] = useState(false);

  const product = useMemo(() => ({
    title,
    price: `$${price}.00`,
    creator: 'Board creator',
  }), [price, title]);

  if (paid) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#050508]/80 px-4 backdrop-blur-md">
        <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#12121A] p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#10B981] text-white"><FiCheck className="h-8 w-8" /></div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#F0F0F5]">Unlocked!</h1>
          <p className="mt-3 text-sm leading-7 text-[#9CA3AF]">{product.title} is ready. Check your email or visit your inventory anytime.</p>
          <button className="mt-6 w-full rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">Download now</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050508]/70 px-4 py-6 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-lg items-end sm:items-center">
        <div className="w-full rounded-t-[32px] border border-white/10 bg-[#1A1A24] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)] sm:rounded-[32px]">
          <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/15" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#D4AF37]">Claim your unlock</p>
              <h1 className="mt-2 text-2xl font-semibold text-[#F0F0F5]">{product.title}</h1>
              <p className="mt-2 text-sm text-[#9CA3AF]">by {product.creator}</p>
            </div>
            <button className="rounded-full border border-white/10 bg-white/[0.03] p-2 text-[#9CA3AF]"><FiX className="h-5 w-5" /></button>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[#F0F0F5]">{product.title}</div>
                <div className="text-sm text-[#9CA3AF]">Instant access</div>
              </div>
              <div className="text-lg font-semibold text-[#D4AF37]">{product.price}</div>
            </div>
          </div>

          <button className="mt-4 w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white">
            Pay with Apple Pay
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#6B7280]"><span className="h-px flex-1 bg-white/10" />or pay with card<span className="h-px flex-1 bg-white/10" /></div>

          <div className="space-y-3">
            <Field label="Card number" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Expiry" />
              <Field label="CVC" />
            </div>
          </div>

          <button onClick={() => setPaid(true)} className="mt-5 w-full rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
            Pay {product.price}
          </button>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.2em] text-[#6B7280]">
            <FiLock className="h-3 w-3" /> Secured by Stripe · Instant download · 30-day refund
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label }: { label: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#9CA3AF]">{label}</label>
      <div className="h-12 rounded-2xl border border-white/10 bg-[#0A0A0F]"></div>
    </div>
  );
}