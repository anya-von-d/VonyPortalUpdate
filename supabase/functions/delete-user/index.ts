import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Verify the caller is a signed-in user ──────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Use anon client + caller's JWT to identify who is making the request
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uid = user.id;

    // ── 2. Clean up user data ─────────────────────────────────────────────────
    // Use admin client (service role) for operations that may be blocked by RLS
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Friendships (both directions) — user vanishes from all friends lists
    await admin.from('friendships').delete().or(`user_id.eq.${uid},friend_id.eq.${uid}`);

    // Public profile — user disappears from Find Friends
    await admin.from('public_profiles').delete().eq('user_id', uid);

    // Payment-method connections
    await admin.from('paypal_connections').delete().eq('user_id', uid);
    await admin.from('venmo_connections').delete().eq('user_id', uid);

    // Profile row — must come after other FK references
    await admin.from('profiles').delete().eq('id', uid);

    // ── 3. Delete auth user — this is the critical step ──────────────────────
    // Loans/payments referencing this user's UUID are left intact so the other
    // party's records are unaffected. Because Supabase issues a new UUID on
    // every sign-up, a new account with the same email can never be linked
    // to the deleted user's loan data.
    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) {
      console.error('auth.admin.deleteUser error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete auth user', detail: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('delete-user error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
