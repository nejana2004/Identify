"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiCheck, FiLink2, FiPlus, FiUpload } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';

const categories = ['product', 'place', 'service'] as const;

type Category = (typeof categories)[number];

export default function NewUnlockPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('product');
  const [description, setDescription] = useState('');
  const [why, setWhy] = useState('');
  const [price, setPrice] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [verifiedOwner, setVerifiedOwner] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supportsPrice = category === 'product' || category === 'service';

  async function uploadAsset(file: File, kind: 'image' | 'file') {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      throw new Error('Please sign in first.');
    }

    const safeName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
    const path = `${user.id}/inventory/${Date.now()}-${safeName}`;
    const buckets = ['product-files', 'products', 'uploads', 'boards'];
    let lastError: any = null;

    for (const bucket of buckets) {
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (!uploadError) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
      }

      lastError = uploadError;
    }

    throw lastError || new Error(`Failed to upload ${kind}.`);
  }

  async function onImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be less than 8MB.');
      return;
    }

    setUploadingImage(true);
    setError('');
    try {
      const url = await uploadAsset(file, 'image');
      setImageUrl(url);
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function publishUnlock() {
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        setError('Please sign in first.');
        setLoading(false);
        return;
      }

      const fullDescription = [description.trim(), why.trim() ? `Why I recommend this: ${why.trim()}` : '']
        .filter(Boolean)
        .join('\n\n');

      const parsedPrice = supportsPrice && price.trim() ? Number(price.replace(/[^0-9.]/g, '')) : null;
      if (parsedPrice !== null && Number.isNaN(parsedPrice)) {
        setError('Price must be a valid number.');
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from('product_cards').insert({
        creator_id: user.id,
        thread_id: null,
        name: name.trim(),
        description: fullDescription || null,
        price: parsedPrice,
        category,
        image_url: imageUrl.trim() || null,
        file_url: null,
        external_link: externalLink.trim() || null,
        verified_owner: verifiedOwner,
      });

      if (insertError) {
        throw insertError;
      }

      setSuccess('Unlock added to your inventory.');
      setTimeout(() => router.push('/keys'), 700);
    } catch (publishError: any) {
      setError(publishError?.message || 'Failed to publish unlock.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/keys" className="text-sm text-[#D4AF37] hover:text-[#F0C94A]">Back to vault control</Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#F0F0F5]">Add new unlock</h1>

      <div className="mt-6 space-y-5 rounded-[24px] border border-white/10 bg-[#111111] p-6">
        <div className="rounded-[18px] border border-dashed border-white/20 bg-black/30 p-6 text-center text-[#9CA3AF]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-[#D4AF37]">
            <FiUpload className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm">Optional: add image/file URLs below if you are not uploading files yet.</p>
        </div>

        <div>
          <label className="cursor-pointer rounded-[16px] border border-white/10 bg-[#0B0B0B] px-4 py-3 text-sm text-[#F0F0F5]">
            <div className="font-semibold">Upload image</div>
            <div className="mt-1 text-xs text-[#9CA3AF]">JPG/PNG/GIF up to 8MB</div>
            <input type="file" accept="image/*" onChange={onImageUpload} className="mt-2 block w-full text-xs text-[#9CA3AF]" />
            {uploadingImage ? <div className="mt-2 text-xs text-[#D4AF37]">Uploading image...</div> : null}
          </label>
        </div>

        <Field label="Product name *" value={name} onChange={setName} placeholder="My first product" />

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                type="button"
                className={`rounded-full px-4 py-2 text-sm ${category === item ? 'bg-[#D4AF37] text-black' : 'border border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Field label="Description" value={description} onChange={setDescription} textarea placeholder="Explain what this unlock includes and who it is for." />
        <Field label="Why I recommend this" value={why} onChange={setWhy} textarea placeholder="Share the reason people should trust this recommendation." />
        {supportsPrice ? <Field label="Price" value={price} onChange={setPrice} placeholder="$29.00" /> : <div className="rounded-[18px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-[#9CA3AF]">Price is optional and only used for product/service cards.</div>}

        <Field label="External link (optional)" value={externalLink} onChange={setExternalLink} placeholder="https://..." />
        <Field label="Image URL (optional)" value={imageUrl} onChange={setImageUrl} placeholder="https://..." />
        <div className="rounded-[18px] border border-white/10 bg-black/30 p-4 text-sm text-[#9CA3AF]">
          <div className="flex items-center gap-2 text-[#F0F0F5]"><FiLink2 className="h-4 w-4 text-[#D4AF37]" /> No upload yet?</div>
          <p className="mt-2">Use an external link for now. Digital file products are out of scope for the first MVP.</p>
        </div>

        <label className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-black/30 p-4 text-sm text-[#F0F0F5]">
          <input type="checkbox" className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent" checked={verifiedOwner} onChange={(event) => setVerifiedOwner(event.target.checked)} />
          <span>
            I own or use this product
            <span className="mt-1 block text-sm text-[#9CA3AF]">Shows a verified owner badge on your card.</span>
          </span>
        </label>

        {error ? <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
        {success ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{success}</div> : null}

        <button
          onClick={publishUnlock}
          disabled={loading || uploadingImage}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {loading ? 'Publishing...' : 'Publish unlock'} {loading ? <FiPlus className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-28 w-full rounded-[18px] border border-white/10 bg-[#0B0B0B] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]"
          placeholder={placeholder}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-[18px] border border-white/10 bg-[#0B0B0B] px-4 py-3 text-[#F0F0F5] outline-none placeholder:text-[#4B5563]"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
