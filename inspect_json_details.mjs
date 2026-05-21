import fs from 'fs';

try {
  const content = fs.readFileSync('backup_rembrandt_config.json', 'utf-8');
  const json = JSON.parse(content);
  
  const fusionLinks = json.linksBar?.find(i => i.name === 'Fusion');
  console.log("Fusion in linksBar:", JSON.stringify(fusionLinks, null, 2));

  const fusionDock = json.googleDock?.find(i => i.name === 'Fusion');
  console.log("Fusion in googleDock:", JSON.stringify(fusionDock, null, 2));
} catch (e) {
  console.error("Error reading file:", e.message);
}
