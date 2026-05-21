import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://humndjymddoitxxkgtyt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjcsImV4cCI6MjA4NjIyNzYyN30.jiT4TWofUUWLsRb_B_4NjWfhCoZt8Vrfe0Jk1OuYERw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // We know rembrandt_config2.json has the 772 events
  console.log("Downloading the correct profile with data (rembrandt_config2.json)...");
  const {data} = await supabase.storage.from('savejson').download('rembrandt_config2.json');
  if (!data) {
     console.error("Could not download backup file.");
     return;
  }
  const t = await data.text();
  const json = JSON.parse(t);
  
  const fusionSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full p-0.5"><defs><linearGradient id="fusion-grad-1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF9B00"/><stop offset="50%" stop-color="#FF5100"/><stop offset="100%" stop-color="#D41400"/></linearGradient><linearGradient id="fusion-grad-2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#D41400"/><stop offset="100%" stop-color="#FF5100"/></linearGradient><linearGradient id="fusion-grad-3" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FF3300"/><stop offset="100%" stop-color="#5A0000"/></linearGradient></defs><polygon points="50,2 98,24 98,76 50,98 2,76 2,24" fill="url(#fusion-grad-1)" opacity="0.15" stroke="url(#fusion-grad-1)" stroke-width="1.5"/><polygon points="8,8 92,8 92,26 34,26 34,46 82,46 82,64 34,64 34,92 8,92" fill="url(#fusion-grad-1)"/><polygon points="92,8 92,26 97,21 97,3" fill="url(#fusion-grad-2)"/><polygon points="82,46 82,64 87,59 87,41" fill="url(#fusion-grad-2)"/><polygon points="8,92 34,92 34,97 8,97" fill="url(#fusion-grad-2)"/><polygon points="8,8 34,26 34,97 8,92" fill="url(#fusion-grad-3)" opacity="0.3"/></svg>';

  const fusionSvgSmall = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full p-0.5"><defs><linearGradient id="fusion-grad-1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF9B00"/><stop offset="50%" stop-color="#FF5100"/><stop offset="100%" stop-color="#D41400"/></linearGradient><linearGradient id="fusion-grad-2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#D41400"/><stop offset="100%" stop-color="#FF5100"/></linearGradient><linearGradient id="fusion-grad-3" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FF3300"/><stop offset="100%" stop-color="#5A0000"/></linearGradient></defs><polygon points="50,2 98,24 98,76 50,98 2,76 2,24" fill="url(#fusion-grad-1)" opacity="0.15" stroke="url(#fusion-grad-1)" stroke-width="1.5"/><polygon points="8,8 92,8 92,26 34,26 34,46 82,46 82,64 34,64 34,92 8,92" fill="url(#fusion-grad-1)"/><polygon points="92,8 92,26 97,21 97,3" fill="url(#fusion-grad-2)"/><polygon points="82,46 82,64 87,59 87,41" fill="url(#fusion-grad-2)"/><polygon points="8,92 34,92 34,97 8,97" fill="url(#fusion-grad-2)"/><polygon points="8,8 34,26 34,97 8,92" fill="url(#fusion-grad-3)" opacity="0.3"/></svg>';

  if (json.googleDock) {
    const item = json.googleDock.find(i => i.name === 'Fusion' || i.id === 'gd-20');
    if (item) item.iconSvg = fusionSvg;
  }

  if (json.linksBar) {
    const item = json.linksBar.find(i => i.name === 'Fusion' || i.id === '9');
    if (item) item.iconSvg = fusionSvgSmall;
  }

  const content = JSON.stringify(json);
  console.log("Uploading restored data (with 772 events) into ALL potential profiles...");

  const filesToUpdate = ['rembrandt_config.json', 'remb_config.json', 'rembrandt_config2.json'];
  
  for (const file of filesToUpdate) {
     const {error: err} = await supabase.storage.from('savejson').upload(file, content, { upsert: true, contentType: 'application/json' });
     if (err) console.error("Error uploading to", file, err);
     else console.log("Success:", file);
  }
  
  console.log("Done! Data restored everywhere.");
}
run();
