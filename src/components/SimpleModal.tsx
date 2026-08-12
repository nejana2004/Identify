"use client";

import type { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';

export default function SimpleModal({
  open,
  title,
  description,
  children,
  onClose,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/70 p-4 sm:items-center">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close modal" />
      <div className={`relative flex max-h-[85vh] w-full ${maxWidth} flex-col rounded-[18px] border border-white/10 bg-[#111111] shadow-[0_24px_90px_rgba(0,0,0,0.45)]`}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-[18px] border-b border-white/10 bg-[#111111] p-5 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#F0F0F5]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[#9CA3AF]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[#9CA3AF] hover:text-[#F0F0F5]">
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 pt-4">{children}</div>
      </div>
    </div>
  );
}