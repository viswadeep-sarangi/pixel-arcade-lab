/**
 * SUPABASE CONFIGURATION - EXAMPLE FILE
 *
 * Copy this file to config.local.js and fill in your Supabase project details.
 * config.local.js is ignored by git.
 */

const supabaseConfigLocal = {
  url: "https://your-project-ref.supabase.co",
  anonKey: "eyJhbGciOi...",
  tableName: "lietome_rooms"
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabaseConfigLocal;
}
