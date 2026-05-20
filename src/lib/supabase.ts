import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://ondtrlthellodkhhrmjx.supabase.co';
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZHRybHRoZWxsb2RraGhybWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4NjM0MSwiZXhwIjoyMDk0MDYyMzQxfQ.W67NwYXR_o6lFR3SnNV3b69RT6dMa-vVoQHOSDSwQLc'; // Warning: Using service key on client side is not recommended for production.

export const supabase = createClient(supabaseUrl, supabaseKey);
