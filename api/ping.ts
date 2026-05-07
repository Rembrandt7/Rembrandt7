import express from "express";
const app = express();

app.get("/api/ping", (req, res) => {
  res.json({ pong: true, message: "Minimal Express app works!" });
});

export default app;
