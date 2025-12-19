"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Profile {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  profile_photo: string | null;
  country: string | null;
  tags_created: string[] | null;
}

const CONTENT_TAGS = [
  'Art & Design', 'Photography', 'Music', 'Writing', 'Coding', 'Cooking',
  'Fashion', 'Fitness', 'Travel', 'Gaming', 'Business', 'Education',
  'Comedy', 'Beauty', 'DIY', 'Tech', 'Sports', 'Nature', 'Books', 'Movies'
];

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    bio: '',
    country: '',
    tagsCreated: [] as string[]
  });
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
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        // Load user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileError) throw profileError;
        
        // If no profile exists, redirect to onboarding
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
          tagsCreated: profileData.tags_created || []
        });
        
        if (profileData.profile_photo) {
          setPhotoPreview(profileData.profile_photo);
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [router]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tagsCreated: prev.tagsCreated.includes(tag)
        ? prev.tagsCreated.filter(t => t !== tag)
        : [...prev.tagsCreated, tag]
    }));
  };
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setPhotoPreview(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const uploadProfilePhoto = async (): Promise<string | null> => {
    if (!profilePhoto || !profile) return null;
    
    try {
      const fileExt = profilePhoto.name.split('.').pop();
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`;
      
      // Upload to avatars bucket
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, profilePhoto, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload photo: ${uploadError.message}`);
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
        
      return publicUrl;
    } catch (err: any) {
      console.error('Error in uploadProfilePhoto:', err);
      throw err;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Check if username already exists
      if (formData.username !== profile.username) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', formData.username)
          .neq('id', profile.id)
          .maybeSingle();
          
        if (existingUser) {
          setError('Username is already taken');
          setSaving(false);
          return;
        }
      }
      
      // Upload profile photo if changed
      let photoUrl = profile.profile_photo;
      if (profilePhoto) {
        photoUrl = await uploadProfilePhoto();
      }
      
      // Update profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: formData.name,
          username: formData.username,
          bio: formData.bio,
          country: formData.country,
          tags_created: formData.tagsCreated,
          profile_photo: photoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
        
      if (updateError) throw updateError;
      
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 mt-6 sm:mt-10">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">Loading...</h1>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 mt-4 sm:mt-10">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Edit Your Profile</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <div className="mb-4 sm:mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Photo
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-200 ring-4 ring-gray-100">
                {photoPreview ? (
                  <Image 
                    src={photoPreview} 
                    alt="Profile Preview" 
                    width={112} 
                    height={112} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white text-3xl font-bold">
                    {formData.name?.charAt(0)?.toUpperCase() || formData.username?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              {/* Hover overlay for photo */}
              <label 
                htmlFor="photo-upload"
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <label 
                htmlFor="photo-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Photo
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500">JPG, PNG or GIF. Max 5MB.</p>
              {profilePhoto && (
                <p className="text-xs text-green-600 font-medium">✓ New photo selected</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              rows={4}
            />
          </div>
          
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content You Create
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border rounded p-3">
              {CONTENT_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.tagsCreated.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Selected: {formData.tagsCreated.length} tag{formData.tagsCreated.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
