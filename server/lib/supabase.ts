import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const useSupabase = Boolean(url && serviceKey);

export const supabase = useSupabase
  ? createClient(url!, serviceKey!, {
      auth: { persistSession: false },
    })
  : null as any;

// Ensure uploads bucket exists (best-effort)
export async function ensureBuckets() {
  if (!useSupabase) return;
  try {
    const { data: existing } = await supabase.storage.listBuckets();
    const hasUploads = (existing || []).some((b: any) => b.name === "uploads");
    if (!hasUploads) {
      await supabase.storage.createBucket("uploads", { public: true });
    }
  } catch (e) {
    // ignore errors; this is best-effort
    console.warn("Supabase bucket check failed", e);
  }
}
