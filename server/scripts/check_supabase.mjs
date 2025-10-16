import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(2);
}

const supabase = createClient(url, key);

async function main(){
  try {
    console.log('Supabase URL:', url);
    // List buckets
    const buckets = await supabase.storage.listBuckets();
    console.log('buckets:', buckets?.data?.map(b=>b.name));

    // Check tables existence by attempting a select
    const { data, error } = await supabase.from('cases').select('*').limit(1);
    if (error) {
      console.log('cases table query error:', error.message);
    } else {
      console.log('cases table exists, returned rows:', (data||[]).length);
    }

    const { data: mediaData, error: mediaErr } = await supabase.from('media').select('*').limit(1);
    if (mediaErr) {
      console.log('media table query error:', mediaErr.message);
    } else {
      console.log('media table exists, returned rows:', (mediaData||[]).length);
    }

    // Get project ref from URL
    try{
      const ref = new URL(url).host.split('.')[0];
      console.log('project ref:', ref);
    } catch(e){}

    process.exit(0);
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  }
}

main();
