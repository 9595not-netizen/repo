// Re-export single Supabase client to avoid "Multiple GoTrueClient instances" warning.
// All code should use this instance or import from '@/lib/supabase' (same instance).
export { supabase } from '@/lib/supabase';