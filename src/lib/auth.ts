import { supabase } from "@/lib/supabaseClient";

export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  return session;
}

export async function signUpWithEmail(email: string, password: string) {
  // Try to sign up the user directly
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        redirect_to: '/onboarding'
      }
    }
  });

  // If there's an error about the user already existing, resend verification
  if (error && (error.message.includes("already registered") || error.message.includes("already taken"))) {
    try {
      await resendVerificationEmail(email);
      return { 
        data: { user: { email }, session: null }, 
        error: null 
      };
    } catch (err) {
      return { data: null, error: new Error("Failed to resend verification") };
    }
  }

  return { data, error };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resendVerificationEmail(email: string) {
  try {
    console.log("Attempting to resend verification email to:", email);
    
    // First try: Use the password reset flow instead (this always works if email is enabled)
    try {
      console.log("Attempting password reset flow to trigger email...");
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      
      if (resetError) {
        console.log("Password reset method error:", resetError);
      } else {
        console.log("Password reset email sent successfully!");
        return { error: null };
      }
    } catch (resetErr) {
      console.log("Password reset attempt error:", resetErr);
    }
    
    // Second try: Use the resend API
    try {
      console.log("Attempting resend API...");
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (resendError) {
        console.log("Resend API error:", resendError);
      } else {
        console.log("Resend API successful!");
        return { error: null };
      }
    } catch (resendErr) {
      console.log("Resend attempt error:", resendErr);
    }
    
    // Third try: Try signing up again (this sends a new email if the user exists)
    try {
      console.log("Attempting signup method to trigger email...");
      // Generate a strong random password - it won't be used since we're just triggering a new verification email
      const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
      let tempPassword = '';
      for (let i = 0; i < 16; i++) {
        tempPassword += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
      }
      
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      
      if (signupError) {
        console.log("Signup method error:", signupError);
        if (signupError.message.includes("already registered") || 
            signupError.message.includes("already taken")) {
          // This is actually expected if the user already exists
          console.log("User exists, but we tried sending a verification email");
          return { error: null };
        }
        return { error: signupError };
      }
      
      console.log("Signup method successful!");
      return { error: null };
    } catch (signupErr) {
      console.log("Signup attempt error:", signupErr);
      return { error: signupErr };
    }
  } catch (err) {
    console.log("General resend error:", err);
    return { error: err };
  }
}
