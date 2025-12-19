"use client";

import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabaseClient";
import dynamic from 'next/dynamic';

function DebugAuth() {
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<any>(null);
  
  // Check auth status on load
  useEffect(() => {
    async function checkAuth() {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();
        
        setAuthStatus({ session, user });
        
        // If user exists, check database records
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
            
          setDbStatus({ profile: profileData, user: userData });
        }
      } catch (err) {
        console.error("Error checking auth:", err);
      }
    }
    
    checkAuth();
  }, []);
  
  async function testEmailAuth() {
    setLoading(true);
    setOutput("Testing email authentication...\n");
    
    try {
      // Test if we can get auth settings
      setOutput(prev => prev + "Getting auth settings...\n");
      
      // Try to create a basic signup request
      const testEmail = `test-${Math.floor(Math.random() * 10000)}@gmail.com`;
      const testPass = `Password${Date.now()}`;
      
      setOutput(prev => prev + `Attempting signup with ${testEmail}...\n`);
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPass,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        setOutput(prev => prev + `Error during signup: ${error.message}\n`);
        if (error.message.includes("disabled")) {
          setOutput(prev => prev + "\n⛔️ Email authentication appears to be disabled in Supabase!\n");
          setOutput(prev => prev + "Please enable it in your Supabase dashboard:\n");
          setOutput(prev => prev + "1. Go to Authentication > Providers\n");
          setOutput(prev => prev + "2. Enable Email provider\n");
          setOutput(prev => prev + "3. Save changes\n");
        } else if (error.message.includes("invalid")) {
          setOutput(prev => prev + "\n⛔️ Supabase is rejecting the test email as invalid.\n");
          setOutput(prev => prev + "Let's try the Magic Link approach instead...\n");
          
          // Try magic link
          try {
            setOutput(prev => prev + "\nTrying magic link authentication with a real email...\n");
            setOutput(prev => prev + "Enter a real email in the verify-email page to test this.\n");
          } catch (magicErr) {
            setOutput(prev => prev + `Magic link error: ${magicErr}\n`);
          }
        }
      } else {
        setOutput(prev => prev + `Signup successful! User ID: ${data.user?.id}\n`);
        setOutput(prev => prev + "✅ Email authentication is enabled\n");
        setOutput(prev => prev + "Check your Supabase logs for the confirmation email\n");
      }
      
      // Test environment variables
      setOutput(prev => prev + "\nChecking environment variables...\n");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      setOutput(prev => prev + `SUPABASE_URL: ${url ? "✅ Set" : "❌ Missing"}\n`);
      setOutput(prev => prev + `SUPABASE_ANON_KEY: ${anonKey ? "✅ Set" : "❌ Missing"}\n`);
      
    } catch (err) {
      setOutput(prev => prev + `Unexpected error: ${err}\n`);
    } finally {
      setLoading(false);
    }
  }
  
  async function completeRegistration() {
    if (!authStatus?.user?.id) {
      alert("You must be logged in to complete registration");
      return;
    }
    
    try {
      setLoading(true);
      setOutput("Attempting to complete registration manually...\n");
      
      // Create a test username based on email prefix
      const email = authStatus.user.email || '';
      const usernameBase = email.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`;
      const username = `${usernameBase}_${Math.floor(Math.random() * 1000)}`;
      
      setOutput(prev => prev + `Using username: ${username}\n`);
      setOutput(prev => prev + `Calling API...\n`);
      
      // Check if any SQL functions exist first
      try {
        setOutput(prev => prev + "Checking if required functions exist...\n");
        const functionChecks = [
          { name: 'user_exists', description: 'basic verification function' },
          { name: 'admin_create_user_complete', description: 'admin bypass function' },
          { name: 'get_user_if_exists', description: 'user fetch function' },
          { name: 'manual_insert_user', description: 'manual insert function' },
          { name: 'create_user_profile', description: 'profile creation function' }
        ];
        
        let missingFunctions = false;
        
        for (const func of functionChecks) {
          try {
            // Test if function exists by calling it with invalid params
            // This will error, but differently if the function exists vs doesn't exist
            await supabase.rpc(func.name, { dummy: 'test' });
          } catch (err: any) {
            const errorMessage = err.message || '';
            if (errorMessage.includes("function") && errorMessage.includes("does not exist")) {
              setOutput(prev => prev + `❌ Function '${func.name}' (${func.description}) does not exist!\n`);
              missingFunctions = true;
            } else {
              setOutput(prev => prev + `✅ Function '${func.name}' exists (${func.description}).\n`);
            }
          }
        }
        
        if (missingFunctions) {
          setOutput(prev => prev + "\n⚠️ Some required functions are missing! Please run the SQL scripts:\n");
          setOutput(prev => prev + "1. setup_rls.sql\n");
          setOutput(prev => prev + "2. debug_functions.sql\n");
          setOutput(prev => prev + "3. user_exists_function.sql\n");
          setOutput(prev => prev + "4. admin_bypass.sql\n\n");
        }
      } catch (funcCheckErr) {
        setOutput(prev => prev + `Error checking functions: ${funcCheckErr}\n`);
      }
      
      // Try to directly check if the user already exists
      try {
        const { data: userExists, error: existsError } = await supabase.rpc('get_user_if_exists', {
          user_id: authStatus.user.id
        });
        
        if (!existsError && userExists && userExists.exists === true) {
          setOutput(prev => prev + "User already exists in database!\n");
          if (userExists.user) {
            setOutput(prev => prev + `Existing user details: ${JSON.stringify(userExists.user, null, 2)}\n`);
            
            // Update database status
            setDbStatus({ 
              profile: null, 
              user: userExists.user 
            });
            
            setOutput(prev => prev + "✅ User record confirmed - registration is complete!\n");
            return;
          }
        }
      } catch (existsErr) {
        // If this fails, continue with normal registration
      }
      
      // Call our API
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authStatus.user.id,
          username: username,
          name: "Test User",
          bio: "This is a test user created by the debug tool",
          country: "USA",
          tagsCreated: [],
          tagsLiked: []
        }),
      });
      
      if (!response.ok) {
        setOutput(prev => prev + `API response not OK: ${response.status} ${response.statusText}\n`);
        const text = await response.text();
        setOutput(prev => prev + `Response text: ${text}\n`);
        throw new Error(`API returned ${response.status}: ${text}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        setOutput(prev => prev + `API returned error: ${data.error}\n`);
        throw new Error(data.error || "Unknown API error");
      }
      
      setOutput(prev => prev + "✅ Registration completed successfully!\n");
      
      // Log detailed response
      if (data.message) {
        setOutput(prev => prev + `Method: ${data.message}\n`);
      }
      
      if (data.verified) {
        setOutput(prev => prev + "✅ Record existence verified via user_exists function\n");
      }
      
      if (data.userData) {
        setOutput(prev => prev + `User record created: ${JSON.stringify(data.userData, null, 2)}\n`);
        
        // Update database status with returned user data
        setDbStatus({ 
          profile: null, 
          user: data.userData 
        });
      }
      
      if (data.rawResponse) {
        setOutput(prev => prev + `Raw response: ${JSON.stringify(data.rawResponse, null, 2)}\n`);
      }
      
      setOutput(prev => prev + "Refreshing database status...\n");
      
      // Refresh database status
      if (authStatus?.user?.id) {
        // Try getting profile data first
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authStatus.user.id);
          
        if (profileError) {
          setOutput(prev => prev + `Profile query error: ${profileError.message}\n`);
        }
        
        // Then try getting user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authStatus.user.id);
          
        if (userError) {
          setOutput(prev => prev + `User query error: ${userError.message}\n`);
        }
        
        // Set database status with first item from arrays if present
        setDbStatus({ 
          profile: profileData && profileData.length > 0 ? profileData[0] : null, 
          user: userData && userData.length > 0 ? userData[0] : null 
        });
        
        if (userData && userData.length > 0) {
          setOutput(prev => prev + `User record confirmed in database: ${userData[0].username}\n`);
        } else if (profileData && profileData.length > 0) {
          setOutput(prev => prev + `Profile record confirmed in database: ${profileData[0].username}\n`);
        } else {
          setOutput(prev => prev + "⚠️ Registration API returned success but no database records found on verification!\n");
          setOutput(prev => prev + "This suggests RLS policies may be preventing reading the records.\n");
          
          // Try calling the custom SQL function directly to check if the user exists
          try {
            setOutput(prev => prev + "Checking existence via SQL function...\n");
            const { data, error } = await supabase.rpc('user_exists', {
              user_id: authStatus.user.id
            });
            
            if (error) {
              setOutput(prev => prev + `Function error: ${error.message}\n`);
              setOutput(prev => prev + "The 'user_exists' function may not exist. Let's create it:\n\n");
              setOutput(prev => prev + `
CREATE OR REPLACE FUNCTION user_exists(user_id UUID) 
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users WHERE id = user_id;
  RETURN user_count > 0;
END;
$$ LANGUAGE plpgsql;
`);
            } else if (data === true) {
              setOutput(prev => prev + "✅ User exists according to SQL function, but RLS prevents reading it.\n");
            } else {
              setOutput(prev => prev + "❌ User does not exist according to SQL function.\n");
            }
          } catch (err) {
            setOutput(prev => prev + `Error checking user existence: ${err instanceof Error ? err.message : String(err)}\n`);
          }
        }
      }
    } catch (err) {
      setOutput(prev => prev + `Error: ${err instanceof Error ? err.message : String(err)}\n`);
    } finally {
      setLoading(false);
    }
  }
  
  async function manualSignOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }
  
  async function tryDirectRegistration() {
    if (!authStatus?.user?.id) {
      alert("You must be logged in to complete registration");
      return;
    }
    
    try {
      setLoading(true);
      setOutput("Attempting direct registration with RPC function...\n");
      
      // Create a test username based on email prefix
      const email = authStatus.user.email || '';
      const usernameBase = email.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`;
      const username = `${usernameBase}_${Math.floor(Math.random() * 1000)}`;
      
      setOutput(prev => prev + `Using username: ${username}\n`);
      
      // Call RPC function directly
      const { data, error } = await supabase.rpc('create_user_profile', {
        user_id: authStatus.user.id,
        user_name: "Test User",
        user_username: username
      });
      
      if (error) {
        setOutput(prev => prev + `RPC function error: ${error.message}\n`);
        // Try direct insert as a last resort
        try {
          setOutput(prev => prev + "Trying direct insert as last resort...\n");
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authStatus.user.id,
              username: username,
              name: "Test User",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            setOutput(prev => prev + `Direct insert error: ${insertError.message}\n`);
            return;
          }
          
          setOutput(prev => prev + "✅ Direct insert successful!\n");
        } catch (insertErr) {
          setOutput(prev => prev + `Insert exception: ${insertErr instanceof Error ? insertErr.message : String(insertErr)}\n`);
        }
      } else {
        setOutput(prev => prev + "✅ RPC function successful!\n");
      }
      
      // Refresh database status
      if (authStatus?.user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authStatus.user.id);
          
        if (profileError) {
          setOutput(prev => prev + `Profile query error: ${profileError.message}\n`);
        }
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authStatus.user.id);
          
        if (userError) {
          setOutput(prev => prev + `User query error: ${userError.message}\n`);
        }
        
        setDbStatus({ 
          profile: profileData && profileData.length > 0 ? profileData[0] : null, 
          user: userData && userData.length > 0 ? userData[0] : null 
        });
        
        if (userData && userData.length > 0) {
          setOutput(prev => prev + `User record found: ${userData[0].username}\n`);
        } else if (profileData && profileData.length > 0) {
          setOutput(prev => prev + `Profile record found: ${profileData[0].username}\n`);
        } else {
          setOutput(prev => prev + "⚠️ No database records found after attempt!\n");
        }
      }
    } catch (err) {
      setOutput(prev => prev + `Error: ${err instanceof Error ? err.message : String(err)}\n`);
    } finally {
      setLoading(false);
    }
  }
  
  async function tryCustomSQL() {
    if (!authStatus?.user?.id) {
      alert("You must be logged in to complete registration");
      return;
    }
    
    try {
      setLoading(true);
      setOutput("Attempting registration with custom SQL...\n");
      
      // Create a test username based on email prefix
      const email = authStatus.user.email || '';
      const usernameBase = email.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`;
      const username = `${usernameBase}_${Math.floor(Math.random() * 1000)}`;
      
      setOutput(prev => prev + `Using username: ${username}\n`);
      
      // Try the debug function first if it exists
      try {
        const { data: debugData, error: debugError } = await supabase.rpc('direct_insert_debug', {
          user_id: authStatus.user.id,
          user_name: "Test User Debug",
          user_username: username
        });
        
        if (!debugError && debugData) {
          setOutput(prev => prev + "✅ Debug insert function returned data:\n");
          setOutput(prev => prev + JSON.stringify(debugData, null, 2) + "\n");
          
          if (debugData.success) {
            setOutput(prev => prev + "✅ Debug insert successful!\n");
            if (debugData.post_exists) {
              setOutput(prev => prev + "✅ Record exists after insert according to debug function\n");
            } else {
              setOutput(prev => prev + "❌ Record does NOT exist after insert according to debug function\n");
            }
            
            // Refresh from the database directly
            try {
              setOutput(prev => prev + "Trying to refresh record from database...\n");
              
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authStatus.user.id);
                
              if (error) {
                setOutput(prev => prev + `Database query error: ${error.message}\n`);
              } else if (data && data.length > 0) {
                setOutput(prev => prev + "✅ Record found in database!\n");
                setOutput(prev => prev + JSON.stringify(data[0], null, 2) + "\n");
                setDbStatus((prev: any) => ({ 
                  ...prev, 
                  user: data[0]
                }));
                return;
              } else {
                setOutput(prev => prev + "❌ No record found in database query.\n");
              }
            } catch (queryErr) {
              setOutput(prev => prev + `Query error: ${queryErr}\n`);
            }
          } else {
            setOutput(prev => prev + `❌ Debug insert failed: ${debugData.error || 'Unknown error'}\n`);
          }
          
          // Return early since we got debug info
          return;
        }
      } catch (debugErr) {
        // Debug function likely doesn't exist, continue with regular approach
        setOutput(prev => prev + "Debug function not available, trying manual_insert_user...\n");
      }
      
      // Execute custom SQL with the regular function
      const { data, error } = await supabase.rpc('manual_insert_user', {
        user_id: authStatus.user.id,
        user_name: "Test User",
        user_username: username
      });
      
      if (error) {
        setOutput(prev => prev + `Custom SQL error: ${error.message}\n`);
        setOutput(prev => prev + "This likely means the 'manual_insert_user' function doesn't exist.\n");
        setOutput(prev => prev + "Please run the complete_setup.sql script in the Supabase SQL Editor.\n");
        return;
      }
      
      setOutput(prev => prev + "✅ Custom SQL function successful!\n");
      
      // Try to check if the user exists using the user_exists function
      try {
        const { data: existsData, error: existsError } = await supabase.rpc('user_exists', {
          user_id: authStatus.user.id
        });
        
        if (existsError) {
          setOutput(prev => prev + `User existence check error: ${existsError.message}\n`);
          setOutput(prev => prev + "The user_exists function may not be installed. Please run the user_exists_function.sql script.\n");
        } else if (existsData === true) {
          setOutput(prev => prev + "✅ User record exists according to user_exists function!\n");
        } else {
          setOutput(prev => prev + "❌ User record does NOT exist according to user_exists function.\n");
        }
      } catch (existsErr) {
        setOutput(prev => prev + `Error checking user existence: ${existsErr instanceof Error ? existsErr.message : String(existsErr)}\n`);
      }
      
      // Try to get the user directly
      try {
        setOutput(prev => prev + "Trying direct database query...\n");
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authStatus.user.id);
          
        if (userError) {
          setOutput(prev => prev + `User query error: ${userError.message}\n`);
        } else if (userData && userData.length > 0) {
          setOutput(prev => prev + "✅ User record found via direct query!\n");
          setOutput(prev => prev + JSON.stringify(userData[0], null, 2) + "\n");
          setDbStatus((prev: any) => ({ 
            ...prev, 
            user: userData[0]
          }));
        } else {
          setOutput(prev => prev + "⚠️ No user record found via query - this may be due to RLS.\n");
        }
      } catch (queryErr) {
        setOutput(prev => prev + `Query error: ${queryErr instanceof Error ? queryErr.message : String(queryErr)}\n`);
      }
    } catch (err) {
      setOutput(prev => prev + `Error: ${err instanceof Error ? err.message : String(err)}\n`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">Auth Debugging</h1>
      
      {/* Authentication Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <h2 className="text-xl font-semibold mb-3">Authentication Status</h2>
        {authStatus ? (
          <div>
            <p className="mb-2">
              <strong>Signed in:</strong> {authStatus.session ? "Yes ✅" : "No ❌"}
            </p>
            {authStatus.user && (
              <div>
                <p className="mb-1"><strong>User ID:</strong> {authStatus.user.id}</p>
                <p className="mb-1"><strong>Email:</strong> {authStatus.user.email}</p>
                <p className="mb-1"><strong>Email confirmed:</strong> {authStatus.user.email_confirmed_at ? "Yes ✅" : "No ❌"}</p>
              </div>
            )}
          </div>
        ) : (
          <p>Loading authentication status...</p>
        )}
      </div>
      
      {/* Database Status */}
      {authStatus?.user && (
        <div className="mb-6 p-4 bg-gray-50 rounded">
          <h2 className="text-xl font-semibold mb-3">Database Records</h2>
          {dbStatus ? (
            <div>
              <p className="mb-2">
                <strong>Profile record:</strong> {dbStatus.profile ? "Exists ✅" : "Missing ❌"}
              </p>
              <p className="mb-2">
                <strong>User record:</strong> {dbStatus.user ? "Exists ✅" : "Missing ❌"}
              </p>
              
              {(!dbStatus.profile && !dbStatus.user) && (
          <div className="mt-3">
                  <p className="text-red-500 mb-2">No database records found! This indicates incomplete registration.</p>
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={completeRegistration}
                      className="bg-green-600 text-white py-2 px-4 rounded font-semibold"
                      disabled={loading}
                    >
                      Complete Registration via API
                    </button>
                    <button
                      onClick={tryDirectRegistration}
                      className="bg-blue-600 text-white py-2 px-4 rounded font-semibold"
                      disabled={loading}
                    >
                      Try Direct SQL Function
                    </button>
                    <button
                      onClick={tryCustomSQL}
                      className="bg-purple-600 text-white py-2 px-4 rounded font-semibold"
                      disabled={loading}
                    >
                      Try Custom SQL Approach
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Loading database status...</p>
          )}
        </div>
      )}
      
      <div className="mb-6">
        <button
          onClick={testEmailAuth}
          disabled={loading}
          className="bg-blue-600 text-white py-2 px-4 rounded font-semibold mr-3"
        >
          {loading ? "Testing..." : "Test Email Authentication"}
        </button>
        
        {authStatus?.session && !dbStatus?.user && !dbStatus?.profile && (
          <button
            onClick={tryDirectRegistration}
            disabled={loading}
            className="bg-green-600 text-white py-2 px-4 rounded font-semibold mr-3"
          >
            Try Direct SQL Function
          </button>
        )}
        
        {authStatus?.session && (
          <button
            onClick={manualSignOut}
            className="bg-red-600 text-white py-2 px-4 rounded font-semibold"
          >
            Sign Out
          </button>
        )}
      </div>
      
      <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-80 whitespace-pre-wrap">
        {output || "Click the buttons above to run tests..."}
      </pre>
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Common Issues</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Email provider might be disabled in Supabase Dashboard</li>
          <li>SMTP settings might not be configured in Supabase</li>
          <li>Email confirmations might be going to spam</li>
          <li>Environment variables might be missing or incorrect</li>
          <li>User might be authenticated but not have database records (incomplete registration)</li>
          <li>Row Level Security (RLS) policies might be preventing database operations</li>
        </ul>
      </div>
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Next Steps</h2>
        <div className="space-y-2">
          <a href="/auth/login" className="block bg-gray-200 p-2 rounded hover:bg-gray-300">Login Page</a>
          <a href="/auth/signup" className="block bg-gray-200 p-2 rounded hover:bg-gray-300">Signup Page</a>
          <a href="/auth/verify-email" className="block bg-gray-200 p-2 rounded hover:bg-gray-300">Verify Email Page</a>
          <a href="/onboarding" className="block bg-gray-200 p-2 rounded hover:bg-gray-300">Onboarding Page</a>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(DebugAuth), { ssr: false });
