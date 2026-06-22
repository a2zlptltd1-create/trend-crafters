// Supabase Client Initialization for Trend Crafters
const supabaseUrl = 'https://pdpcwmtnqwyineqcysca.supabase.co';
const supabaseKey = 'sb_publishable_xX_7Rg4k29XGgm1OO6e1sA_wgrgybpH';

// Initialize the Supabase client
// Note: We expect the Supabase CDN script to be loaded before this script.
let supabase;
if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    window.supabaseClient = supabase;
} else {
    console.error("Supabase CDN is not loaded. Please make sure to include the Supabase CDN script in your HTML.");
}
