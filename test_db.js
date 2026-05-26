import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase.from('chat_sessions').select('messages').not('messages', 'is', null).limit(10);
  if (error) console.error(error);
  else {
    let foundImages = 0;
    data.forEach(row => {
      const msgs = row.messages;
      if (Array.isArray(msgs)) {
        msgs.forEach(msg => {
          if (msg.imageUrl) {
            console.log("Found imageUrl:", msg.imageUrl);
            foundImages++;
          }
          if (msg.attachedImage) {
            console.log("Found attachedImage");
          }
        });
      }
    });
    console.log("Total images found:", foundImages);
  }
}

test();
