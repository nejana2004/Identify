import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    // Get data from request
    const {
      userId,
      username,
      name,
      bio,
      country,
      tagsCreated,
      tagsLiked
    } = await request.json();
    
    // Validate required fields
    if (!userId || !username || !name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }
    
    console.log("API: Attempting to create profile for user:", userId);
    
    // Try the complete_onboarding function first (this is our new approach)
    try {
      console.log("API: Trying complete_onboarding function");
      const { data, error } = await supabase.rpc('complete_onboarding', {
        user_id: userId,
        user_name: name,
        user_username: username,
        user_bio: bio || '',
        user_country: country || ''
      });
      
      if (error) {
        console.error("API: complete_onboarding failed:", error.message);
        console.log("API: Function may not exist yet, trying alternative approaches...");
      } else if (data && data.success) {
        console.log("API: User onboarded successfully!");
        return NextResponse.json({ 
          success: true, 
          message: "Onboarded via complete_onboarding function",
          userData: data.user,
          rawResponse: data
        });
      } else if (data && !data.success) {
        console.error("API: Function returned error:", data.error);
        return NextResponse.json({ 
          success: false, 
          error: data.error || "Unknown error from complete_onboarding function"
        }, { status: 400 });
      }
    } catch (onboardingErr: any) {
      console.error("API: Onboarding function error:", onboardingErr.message);
    }
    
    // Check if user exists via the get_user_if_exists function
    try {
      console.log("API: Checking if user already exists via get_user_if_exists");
      const { data: userData, error: userCheckError } = await supabase.rpc('get_user_if_exists', {
        user_id: userId
      });
      
      if (!userCheckError && userData && userData.exists === true && userData.user) {
        console.log("API: User already exists according to get_user_if_exists!");
        return NextResponse.json({ 
          success: true, 
          message: "User already exists",
          userData: userData.user,
          rawResponse: userData
        });
      }
    } catch (checkErr: any) {
      console.error("API: User check error:", checkErr.message);
    }
    
    // Try the manual_insert_user function
    try {
      console.log("API: Trying manual_insert_user function");
      const { data: manualData, error: manualError } = await supabase.rpc('manual_insert_user', {
        user_id: userId,
        user_name: name,
        user_username: username
      });
      
      if (manualError) {
        console.error("API: manual_insert_user failed:", manualError.message);
      } else {
        console.log("API: User created via manual_insert_user function!");
        
        // Now update the additional fields
        try {
          const { error: updateError } = await supabase
            .from('users')
            .update({
              bio: bio || '',
              country: country || '',
              onboarded_at: new Date().toISOString()
            })
            .eq('id', userId);
            
          if (updateError) {
            console.error("API: Failed to update additional fields:", updateError.message);
          }
        } catch (updateErr) {
          console.error("API: Error updating additional fields:", updateErr);
        }
        
        // Check if the user was actually created
        const { data: checkData, error: checkError } = await supabase.rpc('user_exists', {
          user_id: userId
        });
        
        if (checkError) {
          console.error("API: Failed to verify user creation:", checkError.message);
        } else if (checkData === true) {
          console.log("API: User existence confirmed via user_exists function");
          return NextResponse.json({ 
            success: true, 
            message: "Created via manual_insert_user function",
            verified: true
          });
        } else {
          console.error("API: User does not exist according to user_exists function");
        }
      }
    } catch (manualErr: any) {
      console.error("API: Manual insert error:", manualErr.message);
    }
    
    // Try using create_user_profile as a last resort
    try {
      console.log("API: Trying create_user_profile function");
      const { error: rpcError } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_name: name,
        user_username: username
      });
      
      if (rpcError) {
        console.error("API: create_user_profile failed:", rpcError.message);
        return NextResponse.json({ 
          success: false, 
          error: `All methods failed. Last error: ${rpcError.message}`,
          methods: "Tried admin_create_user_complete, get_user_if_exists, manual_insert_user, and create_user_profile"
        }, { status: 500 });
      }
      
      // Check if the user was actually created
      const { data: existsData, error: existsError } = await supabase.rpc('user_exists', {
        user_id: userId
      });
      
      if (existsError) {
        console.error("API: Failed to verify user creation:", existsError.message);
        return NextResponse.json({ 
          success: false, 
          error: `User creation may have succeeded but verification failed: ${existsError.message}`
        }, { status: 500 });
      } else if (existsData === true) {
        console.log("API: User existence confirmed via user_exists function");
        return NextResponse.json({ 
          success: true, 
          message: "Created via create_user_profile function",
          verified: true
        });
      } else {
        console.error("API: User does not exist according to user_exists function");
        return NextResponse.json({ 
          success: false, 
          error: "No user records found after RPC function"
        }, { status: 500 });
      }
    } catch (rpcErr: any) {
      console.error("API: RPC error:", rpcErr.message);
      return NextResponse.json({ 
        success: false, 
        error: `RPC error: ${rpcErr.message}` 
      }, { status: 500 });
    }
  } catch (parseError: any) {
    console.error("API: Failed to parse request:", parseError.message);
    return NextResponse.json({ 
      success: false, 
      error: `Failed to parse request: ${parseError.message}` 
    }, { status: 400 });
  }
}
