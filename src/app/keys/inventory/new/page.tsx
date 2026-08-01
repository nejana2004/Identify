"use client";

import Link from 'next/link';
import { FiCheck, FiUpload, FiX } from 'react-icons/fi';

const categories = ['Product', 'Place', 'Service', 'Digital'];

export default function NewUnlockPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/keys" className="text-sm text-[#D4AF37] hover:text-[#F0C94A]">Back to vault control</Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#F0F0F5]">Add new unlock</h1>

      <div className="mt-6 space-y-5 rounded-[32px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <UploadArea />

        <Field label="Product name *" placeholder="My first product" />

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category, index) => (
              <button key={category} className={`rounded-full px-4 py-2 text-sm ${index === 0 ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}>
                {category}
              </button>
            ))}
          </div>
        </div>

        <Field label="Description" textarea placeholder="Explain what this unlock includes and who it is for." />
        <Field label="Why I recommend this" textarea placeholder="Share the real reason people should trust it." />
        <Field label="Price *" placeholder="$29.00" />

        <div className="rounded-[24px] border border-dashed border-white/15 bg-[#0A0A0F] p-4 text-sm text-[#9CA3AF]">
          <div className="flex items-center justify-between gap-3">
            <span>File for digital download</span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs">your-file.zip · 2.4MB</span>
          </div>
          <div className="mt-3 flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#F0F0F5]">
              <FiUpload className="h-4 w-4" /> Upload file
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-[#F0F0F5]">
              <FiX className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-[24px] border border-white/10 bg-[#0A0A0F] p-4 text-sm text-[#F0F0F5]">
          <input type="checkbox" className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent text-[#D4AF37]" defaultChecked />
          <span>
            I own or use this product
            <span className="mt-1 block text-sm text-[#9CA3AF]">Shows a verified owner badge on your card.</span>
          </span>
        </label>

        <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F]">
          Publish unlock <FiCheck className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Field({ label, placeholder, textarea = false }: { label: string; placeholder: string; textarea?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">{label}</label>
      {textarea ? (
        <textarea className="min-h-32 w-full rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" placeholder={placeholder} />
      ) : (
        <input className="w-full rounded-[24px] border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]" placeholder={placeholder} />
      )}
    </div>
  );
}

function UploadArea() {
  return (
    <div className="rounded-[28px] border-2 border-dashed border-white/15 bg-[#0A0A0F] p-8 text-center text-[#9CA3AF]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#D4AF37]"><FiUpload className="h-6 w-6" /></div>
      <p className="mt-4 text-base font-medium text-[#F0F0F5]">Drag & drop or click to upload</p>
      <p className="mt-2 text-sm">1:1 ratio, max 5MB, JPG or PNG</p>
    </div>
  );
}