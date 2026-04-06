import { createBrowserClient } from '@supabase/ssr'

let client: any = null;

export function createClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      if (typeof window !== 'undefined') {
        console.error('Supabase URL or Key is missing in browser client creation');
      }
    }
    
    client = createBrowserClient(url!, key!);
  }
  
  return client;
}
