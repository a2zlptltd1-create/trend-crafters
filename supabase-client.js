// Supabase Client Initialization for Trend Crafters
// NOTE: This is the public anon key used by client-side Supabase SDKs.
//       Do not store service_role keys or other private secrets in front-end code.
const supabaseUrl = 'https://pdpcwmtnqwyineqcysca.supabase.co';
const supabaseAnonKey = 'sb_publishable_xX_7Rg4k29XGgm1OO6e1sA_wgrgybpH';

// Initialize the Supabase client
// The public anon key is acceptable for browser apps when RLS policies are correctly configured,
// but any truly sensitive operations should be proxied through a server-side API.
let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    window.supabaseClient = supabase;
} else {
    console.error("Supabase CDN is not loaded. Please make sure to include the Supabase CDN script in your HTML.");
}
