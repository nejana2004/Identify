"use client";

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiCheck, FiEye, FiImage, FiSave, FiTrash2 } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { slugify } from '@/lib/utils';

type BoardRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  board_type: string;
  topic_tags: string[] | null;
  cover_image: string | null;
  slug: string | null;
};

export default function EditBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [board, setBoard] = useState<BoardRow | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [boardType, setBoardType] = useState<'open' | 'invite-only' | 'paid'>('open');
  const [topicTags, setTopicTags] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadBoard() {
      setLoading(true);
      setError('');

      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user) {
          router.push('/auth/login');
          return;
        }

        const { data, error: boardError } = await supabase
          .from('boards')
          .select('id, user_id, title, description, is_public, board_type, topic_tags, cover_image, slug')
          .eq('id', resolvedParams.id)
          .single();

        if (boardError || !data) {
          throw boardError || new Error('Board not found.');
        }

        if (data.user_id !== user.id) {
          router.push(`/b/${data.slug || slugify(data.title)}`);
          return;
        }

        setBoard(data as BoardRow);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setIsPublic(Boolean(data.is_public));
        setBoardType((data.board_type as 'open' | 'invite-only' | 'paid') || 'open');
        setTopicTags((data.topic_tags || []).join(', '));
        setCoverImage(data.cover_image || null);
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load board.');
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, [resolvedParams.id, router]);

  async function uploadCoverImage(file: File) {
    if (!board) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Cover image must be below 5MB.');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${board.id}/cover-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('boards')
        .upload(path, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('boards').getPublicUrl(path);
      setCoverImage(data.publicUrl);
      setSuccess('Cover image updated.');
    } catch (uploadErr: any) {
      setError(uploadErr?.message || 'Failed to upload cover image.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveBoard() {
    if (!board) return;
    if (!title.trim()) {
      setError('Board title is required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const normalizedTags = topicTags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8);

      const nextSlug = slugify(title.trim());

      const { error: updateError } = await supabase
        .from('boards')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
          board_type: boardType,
          topic_tags: normalizedTags.length > 0 ? normalizedTags : null,
          cover_image: coverImage,
          slug: nextSlug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', board.id)
        .eq('user_id', board.user_id);

      if (updateError) {
        throw updateError;
      }

      setSuccess('Board saved.');
      setTimeout(() => router.push(`/b/${nextSlug}`), 550);
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save board.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteBoard() {
    if (!board) return;
    if (!window.confirm('Delete this board and all thread data?')) return;

    setDeleting(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('boards')
        .delete()
        .eq('id', board.id)
        .eq('user_id', board.user_id);

      if (deleteError) {
        throw deleteError;
      }

      router.push('/boards');
    } catch (deleteErr: any) {
      setError(deleteErr?.message || 'Failed to delete board.');
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-[#9CA3AF]">Loading board editor...</div>;
  }

  if (!board) {
    return <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-red-300">Board unavailable.</div>;
  }

  const canonicalHref = `/b/${board.slug || slugify(board.title)}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <Link href={canonicalHref} className="inline-flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-[#F0F0F5]">
        <FiArrowLeft className="h-4 w-4" /> Back to board
      </Link>

      <div className="rounded-[18px] border border-white/10 bg-[#0E0E0E] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#F5F5F5]">Edit board</h1>
            <p className="mt-1 text-sm text-[#8D8D8D]">Tighter, Reddit-style board settings with one clear save flow.</p>
          </div>
          <Link href={canonicalHref} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#D8D8D8]">
            <FiEye className="h-3.5 w-3.5" /> Preview board
          </Link>
        </div>

        {error ? <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}
        {success ? <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</div> : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Board title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none placeholder:text-[#6B7280]"
                placeholder="Board title"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-[120px] w-full rounded-xl border border-white/10 bg-[#161616] px-3 py-3 text-sm leading-6 text-[#F5F5F5] outline-none placeholder:text-[#6B7280]"
                placeholder="What this board is for"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Topics (comma separated)</label>
              <input
                value={topicTags}
                onChange={(event) => setTopicTags(event.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none placeholder:text-[#6B7280]"
                placeholder="design, tooling, services"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Visibility</label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#121212] p-1">
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`rounded-lg px-3 py-2 text-sm ${isPublic ? 'bg-[#F5F5F5] text-black' : 'text-[#B9B9B9]'}`}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`rounded-lg px-3 py-2 text-sm ${!isPublic ? 'bg-[#F5F5F5] text-black' : 'text-[#B9B9B9]'}`}
                  >
                    Private
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Board mode</label>
                <select
                  value={boardType}
                  onChange={(event) => setBoardType(event.target.value as 'open' | 'invite-only' | 'paid')}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#161616] px-3 text-sm text-[#F5F5F5] outline-none"
                >
                  <option value="open">Open</option>
                  <option value="invite-only">Invite only</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#121212] p-3">
              <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[#8D8D8D]">Cover image</div>
              <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[#1B1B1B]">
                {coverImage ? (
                  <Image src={coverImage} alt="Board cover" fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#707070]">No cover</div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-[#1A1A1A] px-3 py-2 text-sm text-[#EAEAEA]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        uploadCoverImage(file);
                      }
                    }}
                  />
                  <FiImage className="h-4 w-4" />
                  {uploadingImage ? 'Uploading...' : 'Upload'}
                </label>

                {coverImage ? (
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#121212] p-3 text-xs text-[#8D8D8D]">
              Save updates to keep the board slug, discoverability, and posting rules aligned.
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={deleteBoard}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 disabled:opacity-60"
          >
            <FiTrash2 className="h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete board'}
          </button>

          <button
            type="button"
            onClick={saveBoard}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F5F5F5] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save changes'} {saving ? <FiSave className="h-4 w-4" /> : <FiCheck className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
