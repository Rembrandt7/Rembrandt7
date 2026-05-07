export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    diagnostics: {
      nodeVersion: process.version,
      platform: process.platform,
      vercelEnv: process.env.VERCEL || "unknown",
      time: new Date().toISOString()
    }
  });
}
