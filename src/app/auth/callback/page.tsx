"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import dynamic from 'next/dynamic';

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verificationState, setVerificationState] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for errors in the hash fragment
    const hashError = window.location.hash.includes('error=');
    if (hashError) {
      // Extract error description from hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDesc = hashParams.get('error_description')?.replace(/\+/g, ' ');
      
      setVerificationState('error');
      setErrorMessage(errorDesc || 'Verification link is invalid or expired');
      
      // Redirect to verify-email page with the error
      setTimeout(() => {
        router.push(`/auth/verify-email?error_description=${encodeURIComponent(errorDesc || 'Verification failed')}`);
      }, 2000);
      return;
    }

    // Handle the email verification callback
    const handleEmailConfirmation = async () => {
      // First check if we already have a session (for magic links)
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        console.log("User already has a session - likely from magic link");
        setVerificationState('success');
        // Redirect to onboarding after successful verification
        setTimeout(() => {
          router.push("/auth/onboarding");
        }, 1500);
        return;
      }
      
      // If no session, check for code parameter (for email verification)
      const code = searchParams.get("code");

      if (code) {
        try {
          // Exchange the code for a session
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error("Error exchanging code for session:", error.message);
            setVerificationState('error');
            setErrorMessage(error.message);
            setTimeout(() => {
              router.push(`/auth/verify-email?error_description=${encodeURIComponent(error.message)}`);
            }, 2000);
            return;
          }

          // Get current user data
          const { data: { user } } = await supabase.auth.getUser();
          
          // Check if the user is actually registered
          if (user) {
            console.log("User verified and registered:", user.id);
            setVerificationState('success');
            // Redirect to onboarding after successful verification
            setTimeout(() => {
              router.push("/onboarding");
            }, 1500);
          } else {
            console.error("User verified but not registered properly");
            setVerificationState('error');
            setErrorMessage('Account verified but not registered properly. Please try signing in again.');
            setTimeout(() => {
              router.push('/auth/login');
            }, 2000);
          }
        } catch (error: any) {
          console.error("Authentication error:", error);
          setVerificationState('error');
          setErrorMessage(error.message || 'Authentication failed');
          setTimeout(() => {
            router.push(`/auth/verify-email?error_description=${encodeURIComponent(error.message || 'Authentication failed')}`);
          }, 2000);
        }
      } else {
        setVerificationState('error');
        setErrorMessage('No verification code found and no active session');
        setTimeout(() => {
          router.push('/auth/verify-email?error_description=Invalid+verification+link');
        }, 2000);
      }
    };

    handleEmailConfirmation();
  }, [router, searchParams]);

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow text-center">
      {verificationState === 'loading' && (
        <>
          <h2 className="text-2xl font-bold mb-4">Verifying your email...</h2>
          <p className="text-gray-600">Please wait while we verify your email address.</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
          </div>
        </>
      )}
      
      {verificationState === 'success' && (
        <>
          <h2 className="text-2xl font-bold mb-4 text-green-600">Email Verified!</h2>
          <p className="text-gray-600">Your email has been successfully verified. Redirecting to onboarding...</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
          </div>
        </>
      )}
      
      {verificationState === 'error' && (
        <>
          <h2 className="text-2xl font-bold mb-4 text-red-600">Verification Failed</h2>
          <p className="text-gray-600">{errorMessage || 'There was an error verifying your email'}</p>
          <p className="mt-2 text-gray-600">Redirecting to verification page...</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
          </div>
        </>
      )}
    </div>
  );
}

// Export as dynamic component with SSR disabled to prevent hydration errors
export default dynamic(() => Promise.resolve(AuthCallback), { ssr: false });
