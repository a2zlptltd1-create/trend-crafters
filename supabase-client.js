// Supabase Client Initialization for Trend Crafters
const supabaseUrl = 'https://nvqxwonbtijraotzwqlg.supabase.co';
const supabaseKey = 'sb_publishable_xwSvjW__FEqsGfCioYry6g_VD7w9Mwg';

// Initialize the Supabase client
// Note: We expect the Supabase CDN script to be loaded before this script.
let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    window.supabaseClient = supabase;
} else {
    console.error("Supabase CDN is not loaded. Please make sure to include the Supabase CDN script in your HTML.");
}
