import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigError =
  !SUPABASE_URL || !SUPABASE_KEY
    ? "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in environment"
    : null;

if (supabaseConfigError) {
  throw new Error(supabaseConfigError);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
