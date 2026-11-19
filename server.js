require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DEMO_MODE = (process.env.DEMO_MODE || "true").toLowerCase() !== "false";
const DATA_DIR = path.join(__dirname, "data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function readJobs() {
  try { return JSON.parse(fs.readFileSync(JOBS_FILE, "utf8")); }
  catch { return []; }
}
function writeJobs(jobs) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "VISION AI", demoMode: DEMO_MODE });
});

app.get("/api/jobs", (_req, res) => res.json(readJobs()));

app.post("/api/generate", (req, res) => {
  const prompt = String(req.body.prompt || "").trim();
  const style = String(req.body.style || "cinematic");
  const duration = Number(req.body.duration || 5);
  if (prompt.length < 5) return res.status(400).json({ error: "Опиши идею подробнее (минимум 5 символов)." });
  if (prompt.length > 1200) return res.status(400).json({ error: "Промпт слишком длинный. Максимум 1200 символов." });

  // MVP intentionally stays in demo mode: no paid generation API is called.
  if (!DEMO_MODE) {
    return res.status(501).json({ error: "Реальная генерация пока не подключена. Сначала настроим провайдера и лимиты расходов." });
  }

  const job = {
    id: Date.now().toString(36),
    prompt,
    style,
    duration: [5, 10].includes(duration) ? duration : 5,
    status: "demo",
    createdAt: new Date().toISOString(),
    message: "Заявка создана в демо-режиме. Видео пока не рендерится."
  };
  const jobs = readJobs();
  jobs.unshift(job);
  writeJobs(jobs.slice(0, 50));
  res.status(201).json(job);
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`VISION AI running on port ${PORT}`));