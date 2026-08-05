let supabaseConfig = null;
window.supabaseClient = null;
window.supabaseTable = 'lietome_rooms';

if (typeof supabaseConfigLocal !== 'undefined') {
  supabaseConfig = supabaseConfigLocal;
} else {
  console.warn('Supabase config not loaded. Create games/lietome/config.local.js from config.example.js.');
  supabaseConfig = {
    url: '',
    anonKey: '',
    tableName: 'lietome_rooms'
  };
}

const requiredSupabaseConfigKeys = [
  'url',
  'anonKey'
];

const missingSupabaseConfigKeys = requiredSupabaseConfigKeys.filter((key) => !supabaseConfig[key]);

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  missingSupabaseConfigKeys.push('Supabase SDK script');
}

if (missingSupabaseConfigKeys.length === 0) {
  window.supabaseClient = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
  window.supabaseTable = supabaseConfig.tableName || 'lietome_rooms';
} else {
  console.error('Supabase is not configured. Missing: ' + missingSupabaseConfigKeys.join(', '));
}
