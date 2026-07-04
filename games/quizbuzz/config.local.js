/**
 * SUPABASE CONFIGURATION
 *
 *
 * STEPS:
 * 1. supabase-config.js will automatically use config.local.js if it exists
 */

const supabaseConfigLocal = {
  url: "https://bqqlugrxriixcorlbmaw.supabase.co/rest/v1/",
  anonKey: "sb_publishable_FWJ_OkEnb7gNPUQV7ICqzw_RdF4zJhZ"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabaseConfigLocal;
  console.log('config.local.js loaded successfully. supabaseConfigLocal should be created\n'+ supabaseConfigLocal);
}
