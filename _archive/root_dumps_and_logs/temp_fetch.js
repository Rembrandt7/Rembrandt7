import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const supabase = createClient('https://humndjymddoitxxkgtyt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjcsImV4cCI6MjA4NjIyNzYyN30.jiT4TWofUUWLsRb_B_4NjWfhCoZt8Vrfe0Jk1OuYERw');
(async () => {
  const { data, error } = await supabase.storage.from('savejson').download('notas.json');
  if (error) { console.error(error); return; }
  const text = await data.text();
  fs.writeFileSync('notas_dump.json', text);
  console.log('Done downloading notas_dump.json');
  
  const { data: eData } = await supabase.storage.from('savejson').download('estudios.json');
  if (eData) {
    fs.writeFileSync('estudios_dump.json', await eData.text());
    console.log('Done downloading estudios_dump.json');
  }
})();
