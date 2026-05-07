import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  try {
    const { titleText, subtitleText, themeColor, compositionId = "GlobalVideoTemplate", width, height } = req.body;
    
    const { bundle } = await import("@remotion/bundler");
    const { getCompositions, renderMedia } = await import("@remotion/renderer");
    const os = await import("os");
    const fs = await import("fs");

    console.log("Starting Remotion bundler...");
    const bundled = await bundle({
      entryPoint: path.resolve(process.cwd(), "remotion/index.ts"),
    });

    console.log(`Extracting compositions, searching for ${compositionId}...`);
    const comps = await getCompositions(bundled);
    const composition = comps.find((c) => c.id === compositionId);

    if (!composition) {
      return res.status(404).json({ error: `Composition '${compositionId}' not found` });
    }

    const outputLocation = path.resolve(os.tmpdir(), `remotion-out-${Date.now()}.mp4`);
    
    console.log(`Rendering video...`);
    
    const overrideComposition = {
      ...composition,
      width: width || composition.width,
      height: height || composition.height,
    };

    await renderMedia({
      composition: overrideComposition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation,
      inputProps: { titleText: titleText || "API Generada Global", subtitleText, themeColor }
    });

    console.log("Render complete. Sending file...");
    const fileBuffer = fs.readFileSync(outputLocation);
    res.setHeader('Content-Type', 'video/mp4');
    res.send(fileBuffer);

    // Cleanup
    fs.unlinkSync(outputLocation);

  } catch (error: any) {
    console.error("Remotion render error:", error);
    res.status(500).json({ error: "Video generation failed", details: error.message });
  }
}
