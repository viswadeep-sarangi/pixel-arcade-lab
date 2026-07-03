/**
 * SUPABASE CONFIGURATION
 *
 * DO NOT commit your real credentials to git!
 *
 * STEPS:
 * 1. Copy this file and rename the copy to "config.local.js"
 * 2. Fill in your actual Supabase URL and anon key in config.local.js
 * 3. The config.local.js file is git-ignored and will NOT be committed
 * 4. supabase-config.js will automatically use config.local.js if it exists
 */

const supabaseConfigLocal = {
  url: "https://bqqlugrxriixcorlbmaw.supabase.co/rest/v1/",
  anonKey: "sb_publishable_FWJ_OkEnb7gNPUQV7ICqzw_RdF4zJhZ"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabaseConfigLocal;
}
