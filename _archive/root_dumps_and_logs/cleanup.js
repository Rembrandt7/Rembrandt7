import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient('https://humndjymddoitxxkgtyt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bW5kanltZGRvaXR4eGtndHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTE2MjcsImV4cCI6MjA4NjIyNzYyN30.jiT4TWofUUWLsRb_B_4NjWfhCoZt8Vrfe0Jk1OuYERw');

(async () => {
  console.log("Downloading notas.json...");
  const { data: notasData } = await supabase.storage.from('savejson').download('notas.json');
  if (notasData) {
    const text = await notasData.text();
    const parsed = JSON.parse(text);
    const notes = Array.isArray(parsed) ? parsed : (parsed.notes || []);
    
    // Deduplicate logic
    const uniqueNotes = [];
    const seenText = new Set();
    
    for (const n of notes) {
      if (!n.text && !n.title) continue;
      const key = (n.title || n.text).trim().toLowerCase() + '|' + n.category;
      if (!seenText.has(key)) {
        seenText.add(key);
        // If it looks like an estudio, we should maybe move it?
        // Actually the user said clean up the list of that single event.
        uniqueNotes.push(n);
      } else {
        console.log("Removing duplicate from notas:", n.text || n.title);
      }
    }
    
    if (uniqueNotes.length !== notes.length) {
      const content = JSON.stringify({
        notes: uniqueNotes,
        updatedAt: Date.now()
      }, null, 2);
      await supabase.storage.from('savejson').upload('notas.json', content, { upsert: true });
      console.log("Uploaded deduplicated notas.json length:", uniqueNotes.length);
    } else {
      console.log("No duplicates in notas.json");
    }
  }

  // Same for estudios
  const { data: estData } = await supabase.storage.from('savejson').download('estudios.json');
  if (estData) {
    const text = await estData.text();
    const parsed = JSON.parse(text);
    const notes = Array.isArray(parsed) ? parsed : (parsed.notes || []);
    
    const uniqueEst = [];
    const seenEst = new Set();
    for (const n of notes) {
      const key = (n.title || n.text).trim().toLowerCase();
      if (!seenEst.has(key)) {
        seenEst.add(key);
        uniqueEst.push(n);
      } else {
         console.log("Removing duplicate from estudios:", n.text || n.title);
      }
    }
    
    if (uniqueEst.length !== notes.length) {
      const content = JSON.stringify({
        notes: uniqueEst,
        updatedAt: Date.now()
      }, null, 2);
      await supabase.storage.from('savejson').upload('estudios.json', content, { upsert: true });
      console.log("Uploaded deduplicated estudios.json length:", uniqueEst.length);
    } else {
      console.log("No duplicates in estudios.json");
    }
  }

})();
