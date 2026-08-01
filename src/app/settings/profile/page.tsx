"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  profile_photo: string | null;
  country: string | null;
  tags_created: string[] | null;
}

const CONTENT_TAGS = ['Art & Design', 'Photography', 'Music', 'Writing', 'Coding', 'Cooking', 'Fashion', 'Fitness', 'Travel', 'Gaming', 'Business', 'Education', 'Comedy', 'Beauty', 'DIY', 'Tech', 'Sports', 'Nature', 'Books', 'Movies'];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ name: '', username: '', bio: '', country: '', tagsCreated: [] as string[] });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
        if (profileError) throw profileError;
        if (!profileData) {
          router.push('/onboarding');
          return;
        }

        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          username: profileData.username || '',
          bio: profileData.bio || '',
          country: profileData.country || '',
          tagsCreated: profileData.tags_created || [],
        });

        if (profileData.profile_photo) setPhotoPreview(profileData.profile_photo);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tagsCreated: prev.tagsCreated.includes(tag) ? prev.tagsCreated.filter((item) => item !== tag) : [...prev.tagsCreated, tag],
    }));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    const file = event.target.files[0];
    setProfilePhoto(file);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      if (typeof loadEvent.target?.result === 'string') setPhotoPreview(loadEvent.target.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadProfilePhoto = async (): Promise<string | null> => {
    if (!profilePhoto || !profile) return null;
    const fileExt = profilePhoto.name.split('.').pop();
    const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, profilePhoto, { cacheControl: '3600', upsert: true });
    if (uploadError) throw new Error(`Failed to upload photo: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (formData.username !== profile.username) {
        const { data: existingUser } = await supabase.from('users').select('id').eq('username', formData.username).neq('id', profile.id).maybeSingle();
        if (existingUser) {
          setError('Username is already taken');
          setSaving(false);
          return;
        }
      }

      let photoUrl = profile.profile_photo;
      if (profilePhoto) photoUrl = await uploadProfilePhoto();

      const { error: updateError } = await supabase.from('users').update({
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
        country: formData.country,
        tags_created: formData.tagsCreated,
        profile_photo: photoUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id);

      if (updateError) throw updateError;
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-[#9CA3AF]">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-white/10 bg-[#12121A] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Profile settings</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#F0F0F5]">Edit your creator profile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[#9CA3AF]">Update your identity, bio, topics, and avatar for the public creator surfaces.</p>

        {error && <div className="mt-6 rounded-2xl border border-[#EF4444]/25 bg-[#EF4444]/10 p-4 text-sm text-[#FCA5A5]">{error}</div>}
        {success && <div className="mt-6 rounded-2xl border border-[#10B981]/25 bg-[#10B981]/10 p-4 text-sm text-[#A7F3D0]">{success}</div>}

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <label className="block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">Profile photo</label>
            <label htmlFor="photo-upload" className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-white/15 bg-[#0A0A0F] p-6 text-center">
              <div className="h-28 w-28 overflow-hidden rounded-full border border-white/10 bg-white/[0.03]">
                {photoPreview ? <Image src={photoPreview} alt="Profile preview" width={112} height={112} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(212,175,55,0.35),rgba(15,15,20,1))] text-3xl font-semibold text-[#F0F0F5]">{formData.name?.charAt(0)?.toUpperCase() || formData.username?.charAt(0)?.toUpperCase() || '?'}</div>}
              </div>
              <span className="mt-4 text-sm font-semibold text-[#F0F0F5]">Upload a photo</span>
              <span className="mt-1 text-xs text-[#9CA3AF]">Square image, best at 512px or more</span>
              <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" />
            </label>
          </div>

          <div className="space-y-4 rounded-[28px] border border-white/10 bg-black/20 p-5">
            <Field label="Name" name="name" value={formData.name} onChange={handleInputChange} />
            <Field label="Username" name="username" value={formData.username} onChange={handleInputChange} />
            <Field label="Country" name="country" value={formData.country} onChange={handleInputChange} />
            <Field label="Bio" name="bio" value={formData.bio} onChange={handleInputChange} textarea />

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">Topics you create</label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TAGS.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`rounded-full px-3 py-2 text-sm ${formData.tagsCreated.includes(tag) ? 'bg-[#D4AF37] text-[#0A0A0F]' : 'border border-white/10 bg-white/[0.03] text-[#F0F0F5]'}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <button disabled={saving} className="inline-flex w-full items-center justify-center rounded-2xl bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-[#0A0A0F] disabled:opacity-60">{saving ? 'Saving...' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, textarea = false }: { label: string; name: string; value: string; onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; textarea?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-[#9CA3AF]">{label}</label>
      {textarea ? <textarea name={name} value={value} onChange={onChange} className="min-h-28 w-full rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none" /> : <input name={name} value={value} onChange={onChange} className="w-full rounded-2xl border border-white/10 bg-[#0A0A0F] px-4 py-3 text-[#F0F0F5] outline-none" />}
    </div>
  );
}
