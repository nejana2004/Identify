"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      
      try {
        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }
        
        setUser(user);
        setEmail(user.email || '');
      } catch (err: any) {
        console.error('Error loading user data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadUserData();
  }, [router]);
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      setSuccess('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating password:', err);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    
    setDeleting(true);
    setError(null);
    
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }
      
      // Call the delete API
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }
      
      // Sign out completely
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear any local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Force a full page redirect to clear all state
      window.location.href = '/auth/login?deleted=true';
      
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setError(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-full">
        <h1 className="text-xl sm:text-2xl font-bold mb-6">Loading...</h1>
      </div>
    );
  }
  
  return (
    <div className="max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Account Settings</h1>
      
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
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Email Address</h2>
        <p className="text-gray-800 mb-2 text-sm sm:text-base break-all">{email}</p>
        <p className="text-xs sm:text-sm text-gray-600">
          Your email address is used for logging in and account recovery.
        </p>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 border rounded text-sm sm:text-base"
              required
            />
          </div>
          
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded text-sm sm:text-base"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={processing}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
          >
            {processing ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-red-600">Danger Zone</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2 text-sm sm:text-base">Sign Out</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3">
              Sign out from your account on this device.
            </p>
            <button
              onClick={handleLogout}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
            >
              Sign Out
            </button>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-medium mb-2 text-red-600">Delete Account</h3>
            <p className="text-sm text-gray-600 mb-3">
              Permanently delete your account and all your data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold text-red-600 mb-3 sm:mb-4">⚠️ Delete Account</h2>
            
            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-gray-700">
                This will permanently delete your account including:
              </p>
              
              <ul className="text-xs sm:text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Your profile and all personal data</li>
                <li>All your boards and pins</li>
                <li>All your links</li>
                <li>Your authentication credentials</li>
              </ul>
              
              <p className="text-red-600 font-medium text-xs sm:text-sm">
                This action cannot be undone!
              </p>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Type <span className="font-bold">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
                  placeholder="DELETE"
                />
              </div>
              
              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                    setError(null);
                  }}
                  className="flex-1 py-2 px-3 sm:px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 py-2 px-3 sm:px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
