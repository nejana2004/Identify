# Instructions for setting up Supabase service role key

To properly set up Row Level Security (RLS) with your Supabase application, you need to:

1. Add the SUPABASE_SERVICE_ROLE_KEY to your .env.local file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Get your service role key from the Supabase dashboard:
   - Go to Project Settings > API
   - Look for "service_role key" (this is different from the anon key)
   - Copy this key and add it to your .env.local file

3. Create RLS policies in your Supabase SQL Editor:
   - Run the SQL in the supabase/setup_rls.sql file we created
   - This will set up proper RLS policies and helper functions

IMPORTANT: Keep the service role key secure! Never expose it to the client side.
Only use it in server-side code such as:
- API routes
- Server actions
- Edge functions

The SUPABASE_SERVICE_ROLE_KEY should NOT have the NEXT_PUBLIC_ prefix.
