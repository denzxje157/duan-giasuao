import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ondtrlthellodkhhrmjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZHRybHRoZWxsb2RraGhybWp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ4NjM0MSwiZXhwIjoyMDk0MDYyMzQxfQ.W67NwYXR_o6lFR3SnNV3b69RT6dMa-vVoQHOSDSwQLc'
);

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@gmail.com',
    password: '123456',
    email_confirm: true
  });
  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully:', data.user.email);
  }
}

main();
