import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://humndjymddoitxxkgtyt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjcsImV4cCI6MjA4NjIyNzYyN30.jiT4TWofUUWLsRb_B_4NjWfhCoZt8Vrfe0Jk1OuYERw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Listing files in bucket 'savejson'...");
  const { data, error } = await supabase.storage.from('savejson').list();
  if (error) {
    console.error("Error listing files:", error.message);
    return;
  }
  console.log("Files found:");
  data.forEach(f => {
    console.log(` - ${f.name} (Size: ${f.metadata?.size || 'unknown'} bytes, Last Modified: ${f.created_at})`);
  });
}
run();
