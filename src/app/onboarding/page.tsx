"use client";

import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import { saveOnboarding } from "@/lib/onboarding";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

interface ProfileFormData {
  username: string;
  name: string;
  bio: string;
  country: string;
  tagsCreated: string[];
}

const CONTENT_TAGS = [
  'Art & Design', 'Photography', 'Music', 'Writing', 'Coding', 'Cooking',
  'Fashion', 'Fitness', 'Travel', 'Gaming', 'Business', 'Education',
  'Comedy', 'Beauty', 'DIY', 'Tech', 'Sports', 'Nature', 'Books', 'Movies'
];

function SimpleOnboarding() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    name: '',
    bio: '',
    country: '',
    tagsCreated: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check if user is authenticated
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }
      
      setUser(session.user);
      
      // Check if user is already onboarded
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
        
      if (userData?.onboarded_at) {
        // User is already onboarded, redirect to profile
        router.push(`/profile/${userData.username}`);
        return;
      }
      
      // Prefill form if user record exists
      if (userData) {
        setFormData({
          name: userData.name || '',
          username: userData.username || '',
          bio: userData.bio || '',
          country: userData.country || '',
          tagsCreated: userData.tags_created || []
        });
      }
    }
    
    checkAuth();
  }, [router]);
  
  // Check username availability when it changes
  useEffect(() => {
    const checkUsername = async () => {
      if (!formData.username || formData.username.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('username', formData.username)
          .neq('id', user?.id || '')
          .maybeSingle();
          
        setUsernameAvailable(!data);
      } catch (err) {
        console.error("Error checking username:", err);
      }
    };
    
    const timer = setTimeout(() => {
      checkUsername();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formData.username, user?.id]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // For username, enforce lowercase alphanumeric and underscores only
    if (name === 'username') {
      const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setFormData(prev => ({ ...prev, [name]: sanitized }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tagsCreated: prev.tagsCreated.includes(tag)
        ? prev.tagsCreated.filter(t => t !== tag)
        : [...prev.tagsCreated, tag]
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      // First check if username is available
      if (!usernameAvailable) {
        throw new Error("Username is already taken");
      }
      
      // Try to use the new complete_onboarding function first
      try {
        const { data, error } = await supabase.rpc('complete_onboarding', {
          user_id: user.id,
          user_name: formData.name,
          user_username: formData.username,
          user_bio: formData.bio,
          user_country: formData.country,
          user_tags_created: formData.tagsCreated
        });
        
        if (error) {
          throw error;
        }
        
        if (!data.success) {
          throw new Error(data.error || "Failed to complete onboarding");
        }
        
        // Success!
        setSuccess(true);
        setTimeout(() => {
          router.push(`/profile/${formData.username}`);
        }, 2000);
        
        return;
      } catch (rpcError: any) {
        console.log("RPC function failed, trying fallback methods", rpcError);
        // Continue to fallback methods
      }
      
      // Use our resilient onboarding function instead of direct DB operations
      const { error } = await saveOnboarding({
        userId: user.id,
        username: formData.username,
        name: formData.name,
        bio: formData.bio,
        country: formData.country,
        tagsCreated: formData.tagsCreated,
        tagsLiked: []
      });
      
      // If we got an error, try the server approach
      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes("row-level security")) {
          const { success, error: serverError } = await fetch('/api/onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              username: formData.username,
              name: formData.name,
              bio: formData.bio,
              country: formData.country,
              tagsCreated: formData.tagsCreated,
              tagsLiked: []
            }),
          }).then(res => res.json());
          
          if (!success && serverError) {
            throw new Error(serverError);
          }
        } else {
          throw new Error(errorMessage);
        }
      }
      
      setSuccess(true);
      setTimeout(() => {
        router.push(`/profile/${formData.username}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 sm:mt-20 p-4 sm:p-6 bg-white rounded shadow text-center mx-4 sm:mx-auto">
        <h2 className="text-lg sm:text-xl font-semibold mb-2">Loading...</h2>
        <p className="text-sm sm:text-base text-gray-600">Checking authentication status</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-4 sm:mx-auto mt-10 sm:mt-20 p-4 sm:p-6 bg-white rounded shadow">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">Create Your Profile</h1>
      
      {success ? (
        <div className="text-center">
          <div className="text-green-600 font-semibold mb-2">Profile created successfully!</div>
          <p className="text-gray-600 mb-4">Redirecting you to the dashboard...</p>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <div className="relative">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full border p-2 rounded text-lg ${
                  usernameAvailable === true 
                    ? 'border-green-500' 
                    : usernameAvailable === false 
                      ? 'border-red-500'
                      : ''
                }`}
                required
                minLength={3}
                placeholder="Choose a unique username"
              />
              {usernameAvailable !== null && (
                <div className="absolute right-3 top-3">
                  {usernameAvailable ? (
                    <span className="text-green-500">✓ Available</span>
                  ) : (
                    <span className="text-red-500">✗ Taken</span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Only lowercase letters, numbers, and underscores. Must be at least 3 characters.
            </p>
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border p-2 rounded text-lg"
              required
              placeholder="Your full name"
            />
          </div>
          
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="w-full border p-2 rounded text-lg"
              rows={4}
              placeholder="Tell us a bit about yourself"
              required
            />
          </div>
          
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="w-full border p-2 rounded text-lg"
              required
            >
              <option value="">Select your country</option>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Australia">Australia</option>
              <option value="Germany">Germany</option>
              <option value="France">France</option>
              <option value="Japan">Japan</option>
              <option value="Brazil">Brazil</option>
              <option value="India">India</option>
              <option value="Mexico">Mexico</option>
              <option value="Spain">Spain</option>
              <option value="Italy">Italy</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Sweden">Sweden</option>
              <option value="South Korea">South Korea</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content You Create (Select at least 1)
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
          
          {error && (
            <div className="text-red-500 text-center p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className={`w-full bg-black text-white py-3 rounded text-lg font-semibold ${
              (!usernameAvailable && formData.username.length >= 3) || formData.tagsCreated.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={loading || (!usernameAvailable && formData.username.length >= 3) || formData.tagsCreated.length === 0}
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(SimpleOnboarding), { ssr: false });
