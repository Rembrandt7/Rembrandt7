import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://humndjymddoitxxkgtyt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjcsImV4cCI6MjA4NjIyNzYyN30.jiT4TWofUUWLsRb_B_4NjWfhCoZt8Vrfe0Jk1OuYERw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Downloading config from Supabase (rembrandt_config2.json)...");
  const { data } = await supabase.storage.from('savejson').download('rembrandt_config2.json');
  if (!data) {
     console.error("Could not download backup file.");
     return;
  }
  const t = await data.text();
  const json = JSON.parse(t);
  
  const letrasItem = {
    id: "ut-5-letras",
    name: "Letras",
    description: "ProLed3D Letras y Carteles",
    href: "https://proled3d.com/?lang=es",
    colorClass: "hover:shadow-pink-500/20",
    iconSvg: "<svg class=\"w-full h-full text-pink-400\" viewBox=\"0 0 24 24\" fill=\"currentColor\"><path d=\"M9.93 13.5h4.14L12 7.98 9.93 13.5zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z\"/></svg>"
  };

  const guillocheItem = {
    id: "ut-5-guilloche",
    name: "Guilloche",
    description: "Generador de Patrones",
    href: "https://guillochegenerator.com/",
    colorClass: "hover:shadow-teal-500/20",
    iconSvg: "<svg class=\"w-full h-full text-teal-300\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\" /><ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"4\" transform=\"rotate(0 12 12)\" /><ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"4\" transform=\"rotate(45 12 12)\" /><ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"4\" transform=\"rotate(90 12 12)\" /><ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"4\" transform=\"rotate(135 12 12)\" /></svg>"
  };

  if (Array.isArray(json.usefulTools)) {
    let sec3D = json.usefulTools.find(s => s.id === 'ut-5' || s.title?.toLowerCase().includes('3d') || s.title?.toLowerCase().includes('impresión'));
    if (!sec3D) {
      sec3D = {
        id: 'ut-5',
        title: 'Impresión 3D',
        gradient: 'from-indigo-400 to-blue-600',
        iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>',
        items: []
      };
      json.usefulTools.push(sec3D);
    }
    
    // Add Letras if not present
    if (!sec3D.items.some(i => i.name === 'Letras' || i.href?.includes('proled3d'))) {
      sec3D.items.push(letrasItem);
    }
    // Add Guilloche if not present
    if (!sec3D.items.some(i => i.name === 'Guilloche' || i.href?.includes('guillochegenerator'))) {
      sec3D.items.push(guillocheItem);
    }
    console.log("Updated 3D Section items:", sec3D.items.map(i => i.name));
  }

  // Update Rendair in aiSidebar.quickAccess
  if (json.aiSidebar && Array.isArray(json.aiSidebar.quickAccess)) {
    const rendairItem = json.aiSidebar.quickAccess.find(i => i.name?.toLowerCase().includes('rendair') || i.id === 'qa-1');
    if (rendairItem) {
      rendairItem.href = 'https://rendair.ai/dashboard';
      console.log('Updated Rendair in aiSidebar.quickAccess:', rendairItem.href);
    }
  }

  // Update Rendair in linksBar or other places if present
  if (Array.isArray(json.linksBar)) {
    const rendairBar = json.linksBar.find(i => i.name?.toLowerCase().includes('rendair'));
    if (rendairBar) {
      rendairBar.href = 'https://rendair.ai/dashboard';
      console.log('Updated Rendair in linksBar:', rendairBar.href);
    }
  }

  // Check usefulTools
  if (Array.isArray(json.usefulTools)) {
    for (const sec of json.usefulTools) {
      if (Array.isArray(sec.items)) {
        for (const it of sec.items) {
          if (it.name?.toLowerCase().includes('rendair')) {
            it.href = 'https://rendair.ai/dashboard';
            console.log('Updated Rendair in usefulTools section ' + sec.title + ':', it.href);
          }
        }
      }
    }
  }

  json.updatedAt = new Date().toISOString();

  const content = JSON.stringify(json);
  console.log("Uploading updated config to Supabase...");

  const filesToUpdate = ['rembrandt_config.json', 'remb_config.json', 'rembrandt_config2.json'];
  
  for (const file of filesToUpdate) {
     const {error: err} = await supabase.storage.from('savejson').upload(file, content, { upsert: true, contentType: 'application/json' });
     if (err) console.error("Error uploading to", file, err);
     else console.log("Success updating:", file);
  }
  
  console.log("Done! Letras and Guilloche added to all profiles.");
}
run();
