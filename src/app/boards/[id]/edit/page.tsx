"use client";

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function EditBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function loadBoard() {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Load board
        const { data: board, error: boardError } = await supabase
          .from('boards')
          .select('*')
          .eq('id', resolvedParams.id)
          .single();

        if (boardError) throw boardError;

        // Check ownership
        if (board.user_id !== user.id) {
          router.push(`/boards/${resolvedParams.id}`);
          return;
        }

        setTitle(board.title);
        setDescription(board.description || '');
        setIsPublic(board.is_public);
        setCoverImage(board.cover_image || null);
      } catch (err: any) {
        console.error('Error loading board:', err);
        setError('Failed to load board');
      } finally {
        setLoading(false);
      }
    }

    loadBoard();
  }, [resolvedParams.id, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${resolvedParams.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage (boards bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('boards')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('boards')
        .getPublicUrl(fileName);

      setCoverImage(publicUrl);
      setSuccess('Cover image uploaded!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setCoverImage(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Board title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('boards')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
          cover_image: coverImage
        })
        .eq('id', resolvedParams.id);

      if (updateError) throw updateError;

      setSuccess('Board updated successfully!');
      setTimeout(() => {
        router.push(`/boards/${resolvedParams.id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating board:', err);
      setError(err.message || 'Failed to update board');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      // First delete all pins in this board
      const { error: pinsError } = await supabase
        .from('pins')
        .delete()
        .eq('board_id', resolvedParams.id);

      if (pinsError) throw pinsError;

      // Then delete the board
      const { error: boardError } = await supabase
        .from('boards')
        .delete()
        .eq('id', resolvedParams.id);

      if (boardError) throw boardError;

      // Redirect to boards list
      router.push('/boards');
    } catch (err: any) {
      console.error('Error deleting board:', err);
      setError(err.message || 'Failed to delete board');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/boards/${resolvedParams.id}`} 
            className="text-blue-600 hover:underline flex items-center mb-4"
          >
            ← Back to Board
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Board</h1>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-lg flex items-center">
              <span className="mr-2">✓</span>
              {success}
            </div>
          )}

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Image
            </label>
            <div className="space-y-4">
              {coverImage ? (
                <div className="relative">
                  <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={coverImage}
                      alt="Board cover"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-lg"
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">No cover image</span>
                </div>
              )}
              
              <div>
                <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  {uploadingImage ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      📷 {coverImage ? 'Change Image' : 'Upload Image'}
                    </>
                  )}
                </label>
                <p className="text-xs text-gray-500 mt-1">Max 5MB. JPG, PNG, or GIF.</p>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Board Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your board (optional)"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="mr-2"
                />
                <span className="text-gray-700">🌐 Public</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="mr-2"
                />
                <span className="text-gray-700">🔒 Private</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isPublic ? 'Anyone can view this board' : 'Only you can view this board'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-800 font-medium"
              disabled={deleting}
            >
              🗑️ Delete Board
            </button>
            
            <div className="flex space-x-3">
              <Link
                href={`/boards/${resolvedParams.id}`}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Board?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this board? This will also remove all pins in this board. 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Board'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
