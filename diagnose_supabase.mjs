import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://humndjymddoitxxkgtyt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjcsImV4cCI6MjA4NjIyNzYyN30.jiT4TWofUUWLsRb_B_4NjWfhCoZt8Vrfe0Jk1OuYERw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFile(filename) {
  console.log(`\n==========================================`);
  console.log(`Checking file: ${filename}...`);
  try {
    const { data, error } = await supabase.storage.from('savejson').download(filename);
    if (error) {
      console.error(`Error downloading ${filename}:`, error.message);
      return null;
    }
    const text = await data.text();
    console.log(`File size: ${text.length} bytes`);
    
    // Save locally for backup
    fs.writeFileSync(`backup_${filename}`, text, 'utf-8');
    console.log(`Saved local copy to backup_${filename}`);

    let json;
    try {
      json = JSON.parse(text);
      console.log(`JSON parsing: SUCCESS`);
    } catch (parseError) {
      console.error(`JSON parsing: FAILED! Error:`, parseError.message);
      // Print the first 500 characters and last 500 characters of the text
      console.log(`\n--- START OF FILE (first 300 chars) ---`);
      console.log(text.substring(0, 300));
      console.log(`--- END OF FILE (last 300 chars) ---`);
      console.log(text.substring(Math.max(0, text.length - 300)));
      return null;
    }

    // Inspect fields
    const stats = {
      calendarEvents: Array.isArray(json.calendarEvents) ? json.calendarEvents.length : typeof json.calendarEvents,
      commands: Array.isArray(json.commands) ? json.commands.length : typeof json.commands,
      googleDock: Array.isArray(json.googleDock) ? json.googleDock.length : typeof json.googleDock,
      linksBar: Array.isArray(json.linksBar) ? json.linksBar.length : typeof json.linksBar,
      tabs: Array.isArray(json.tabs) ? json.tabs.length : typeof json.tabs,
      usefulTools: Array.isArray(json.usefulTools) ? json.usefulTools.length : typeof json.usefulTools,
      credenciales: Array.isArray(json.credenciales) ? json.credenciales.length : typeof json.credenciales,
      estudios: Array.isArray(json.estudios) ? json.estudios.length : typeof json.estudios,
      updatedAt: json.updatedAt,
      version: json.version,
    };
    
    console.log('Statistics:', JSON.stringify(stats, null, 2));

    // Verify if Autodesk Fusion is in googleDock and linksBar
    if (Array.isArray(json.googleDock)) {
      const fusionDock = json.googleDock.find(i => i.name === 'Fusion');
      console.log(`Autodesk Fusion in googleDock: ${fusionDock ? 'FOUND' : 'NOT FOUND'}`);
      if (fusionDock) {
        console.log(`  - iconSvg length: ${fusionDock.iconSvg ? fusionDock.iconSvg.length : 0}`);
        console.log(`  - url: ${fusionDock.url}`);
      }
    }
    if (Array.isArray(json.linksBar)) {
      const fusionLinks = json.linksBar.find(i => i.name === 'Fusion');
      console.log(`Autodesk Fusion in linksBar: ${fusionLinks ? 'FOUND' : 'NOT FOUND'}`);
      if (fusionLinks) {
        console.log(`  - iconSvg length: ${fusionLinks.iconSvg ? fusionLinks.iconSvg.length : 0}`);
        console.log(`  - url: ${fusionLinks.url}`);
      }
    }
    return json;
  } catch (err) {
    console.error(`Unexpected error checking ${filename}:`, err);
  }
}

async function run() {
  const files = [
    'rembrandt_config.json',
    'rembrandt_config2.json',
    'remb_config.json',
    'rembrandt_config2_backup.json'
  ];
  for (const f of files) {
    await checkFile(f);
  }
}

run();
