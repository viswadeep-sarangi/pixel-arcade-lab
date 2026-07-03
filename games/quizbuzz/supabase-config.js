let supabaseConfig = null;
window.supabaseClient = null;
window.supabase = null;

if (typeof supabaseConfigLocal !== 'undefined') {
  supabaseConfig = supabaseConfigLocal;
} else {
  console.warn('⚠️  Supabase config not loaded. Did you create config.local.js?');
  console.warn('1. Copy config.example.js to config.local.js');
  console.warn('2. Add your Supabase URL and anon key to config.local.js');
  console.warn('3. Reload the page');
  supabaseConfig = {
    url: '',
    anonKey: ''
  };
}

const requiredSupabaseConfigKeys = ['url', 'anonKey'];
const missingSupabaseConfigKeys = requiredSupabaseConfigKeys.filter((key) => !supabaseConfig[key]);

if (missingSupabaseConfigKeys.length === 0 && window.supabase && typeof window.supabase.createClient === 'function') {
  window.supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
  window.supabase = window.supabaseClient;
} else {
  console.error('Supabase is not configured. Missing: ' + missingSupabaseConfigKeys.join(', '));
  console.error('Config source:', typeof supabaseConfigLocal !== 'undefined' ? 'config.local.js' : 'fallback');
}
