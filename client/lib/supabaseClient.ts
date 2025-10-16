import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const hasSupabase = Boolean(url && anonKey);

export const supabaseClient: SupabaseClient | null = hasSupabase
  ? createClient(url!, anonKey!)
  : null;

export type { Session };
