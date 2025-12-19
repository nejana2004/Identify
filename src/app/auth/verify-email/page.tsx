"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { resendVerificationEmail } from "@/lib/auth";
import { useState as useStateImport } from 'react';
import dynamic from 'next/dynamic';

// Create a component with no SSR to avoid hydration errors
function VerifyEmail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [useMagicLink, setUseMagicLink] = useStateImport(false);
  
  // Get email from localStorage if available
  useEffect(() => {
    const savedEmail = localStorage.getItem('verifyEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  // Get error from URL if present
  const urlError = searchParams.get("error_description")?.replace(/\+/g, " ");

  // Handle resend verification email
  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    
    if (useMagicLink) {
      // Use magic link approach
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        
        if (error) {
          console.error("Magic link error:", error);
          setError(error.message || "Failed to send magic link");
        } else {
          setMessage("Magic link sent! Check your inbox (and spam folder) and click the link to continue.");
        }
      } catch (err) {
        console.error("Magic link error:", err);
        setError(err instanceof Error ? err.message : "Failed to send magic link");
      }
    } else {
      // Use normal verification email
      const { error } = await resendVerificationEmail(email);
      
      if (error) {
        console.error("Verification error:", error);
        // Special case - if it says already registered, that's actually good
        const errorMessage = error instanceof Error ? error.message : 
                            typeof error === 'object' && error !== null && 'message' in error ? 
                            String(error.message) : 'Unknown error';
        
        if (errorMessage.includes("already registered")) {
          setMessage("Verification email sent! Please check your inbox and spam folder.");
        } else {
          setError(errorMessage || "Failed to send verification email");
        }
      } else {
        setMessage("Verification email sent! Please check your inbox and spam folder.");
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-3xl font-bold mb-6 text-center">Email Verification</h2>
      
      {urlError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-600">
          <h3 className="font-bold">Verification Failed</h3>
          <p>{urlError}</p>
        </div>
      )}
      
      <p className="mb-6 text-gray-600">
        {urlError 
          ? "Your email verification link has expired. Please request a new verification email below."
          : "Please verify your email address to continue. If you didn't receive a verification email, you can request a new one."}
      </p>
      
      <form onSubmit={handleResendVerification} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border p-2 rounded text-lg"
          required
        />
        
        {error && <div className="text-red-500 text-center">{error}</div>}
        {message && <div className="text-green-600 text-center">{message}</div>}
        
        <div className="flex items-center space-x-2 mb-4">
          <input
            type="checkbox"
            id="useMagicLink"
            checked={useMagicLink}
            onChange={() => setUseMagicLink(!useMagicLink)}
            className="h-4 w-4"
          />
          <label htmlFor="useMagicLink" className="text-gray-700">
            Use magic link instead (more reliable)
          </label>
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-black text-white py-3 rounded text-lg font-semibold"
          disabled={loading}
        >
          {loading ? "Sending..." : useMagicLink ? "Send Magic Link" : "Resend Verification Email"}
        </button>
      </form>
      
      <div className="mt-6 text-center text-gray-600">
        <a href="/auth/login" className="text-blue-600 font-semibold hover:underline">
          Return to Sign In
        </a>
      </div>
    </div>
  );
}

// Export as dynamic component with SSR disabled to prevent hydration errors
export default dynamic(() => Promise.resolve(VerifyEmail), { ssr: false });
