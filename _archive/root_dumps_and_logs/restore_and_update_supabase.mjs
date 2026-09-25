import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://humndjymddoitxxkgtyt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjcsImV4cCI6MjA4NjIyNzYyN30.jiT4TWofUUWLsRb_B_4NjWfhCoZt8Vrfe0Jk1OuYERw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Reading backup_rembrandt_config2_backup.json...");
  const content = fs.readFileSync('backup_rembrandt_config2_backup.json', 'utf-8');
  const json = JSON.parse(content);

  console.log(`Original calendarEvents count: ${json.calendarEvents?.length || 0}`);
  console.log(`Original commands count: ${json.commands?.length || 0}`);
  console.log(`Original credenciales count: ${json.credenciales?.length || 0}`);
  console.log(`Original linksBar count: ${json.linksBar?.length || 0}`);

  // 1. Add Autodesk Fusion if not present
  const fusionItem = {
    id: "9",
    href: "https://fusion.online.autodesk.com/",
    name: "Fusion",
    colorClass: "text-orange-500 hover:text-orange-400",
    iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-full h-full p-0.5"><defs><linearGradient id="fusion-grad-1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF9B00"/><stop offset="50%" stop-color="#FF5100"/><stop offset="100%" stop-color="#D41400"/></linearGradient><linearGradient id="fusion-grad-2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#D41400"/><stop offset="100%" stop-color="#FF5100"/></linearGradient><linearGradient id="fusion-grad-3" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FF3300"/><stop offset="100%" stop-color="#5A0000"/></linearGradient></defs><polygon points="50,2 98,24 98,76 50,98 2,76 2,24" fill="url(#fusion-grad-1)" opacity="0.15" stroke="url(#fusion-grad-1)" stroke-width="1.5"/><polygon points="8,8 92,8 92,26 34,26 34,46 82,46 82,64 34,64 34,92 8,92" fill="url(#fusion-grad-1)"/><polygon points="92,8 92,26 97,21 97,3" fill="url(#fusion-grad-2)"/><polygon points="82,46 82,64 87,59 87,41" fill="url(#fusion-grad-2)"/><polygon points="8,92 34,92 34,97 8,97" fill="url(#fusion-grad-2)"/><polygon points="8,8 34,26 34,97 8,92" fill="url(#fusion-grad-3)" opacity="0.3"/></svg>'
  };

  if (!json.linksBar) json.linksBar = [];
  const existingFusion = json.linksBar.find(i => i.name === 'Fusion');
  if (!existingFusion) {
    console.log("Adding Autodesk Fusion link to linksBar...");
    json.linksBar.push(fusionItem);
  } else {
    console.log("Autodesk Fusion link already exists. Updating its properties...");
    existingFusion.href = "https://fusion.online.autodesk.com/";
    existingFusion.iconSvg = fusionItem.iconSvg;
  }

  // 2. Add Mercado Libre if not present
  const mercadoLibreItem = {
    id: "1_ml",
    href: "https://www.mercadolibre.com.mx/",
    name: "Mercado Libre",
    colorClass: "text-yellow-400 hover:text-yellow-300",
    iconSvg: '<img src="/mercadolibre_premium.png" class="w-10 h-10 object-contain" />'
  };

  const existingML = json.linksBar.find(i => i.name === 'Mercado Libre');
  if (!existingML) {
    console.log("Adding Mercado Libre link to linksBar...");
    json.linksBar.push(mercadoLibreItem);
  }

  // 3. Set updatedAt to 24 hours in the future to force clients to update their local cache
  const futureTimestamp = Date.now() + 86400000;
  json.updatedAt = futureTimestamp;
  json.version = 2; // Keep version updated
  console.log(`Setting updatedAt timestamp to: ${futureTimestamp} (in the future)`);

  const uploadPayload = JSON.stringify(json, null, 2);
  const filesToUpload = [
    'rembrandt_config.json',
    'remb_config.json',
    'rembrandt_config2.json'
  ];

  console.log("\nUploading restored profile to Supabase...");
  for (const file of filesToUpload) {
    const { error } = await supabase
      .storage
      .from('savejson')
      .upload(file, uploadPayload, {
        contentType: 'application/json',
        upsert: true
      });
    if (error) {
      console.error(`Error uploading to ${file}:`, error.message);
    } else {
      console.log(`Success: Fully restored user profile into ${file}`);
    }
  }

  // Also upload a dedicated backup just in case
  const backupRes = await supabase
    .storage
    .from('savejson')
    .upload('rembrandt_config_restored_backup.json', uploadPayload, {
      contentType: 'application/json',
      upsert: true
    });
  if (backupRes.error) {
    console.error("Error creating restored backup:", backupRes.error.message);
  } else {
    console.log("Success: Created backup file 'rembrandt_config_restored_backup.json'");
  }

  console.log("\n==========================================\nRestoration COMPLETE!");
}

run();
