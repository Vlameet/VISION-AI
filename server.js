require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ENABLE_VIDEO_GENERATION = process.env.ENABLE_VIDEO_GENERATION === "true";
const FAL_KEY = process.env.FAL_KEY;
const FAL_ENDPOINT = "minimax/h3-max-turbo/text-to-video";
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
function updateJob(id, patch) {
  const jobs = readJobs();
  const index = jobs.findIndex(job => job.id === id);
  if (index < 0) return null;
  jobs[index] = { ...jobs[index], ...patch, updatedAt: new Date().toISOString() };
  writeJobs(jobs);
  return jobs[index];
}
async function falFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || data.error || `fal.ai error: HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
async function refreshFalJob(job) {
  if (!job.requestId || !job.statusUrl || !["queued", "processing"].includes(job.status)) return job;
  try {
    const statusData = await falFetch(job.statusUrl);
    const remoteStatus = String(statusData.status || "").toUpperCase();
    if (remoteStatus === "COMPLETED") {
      const result = await falFetch(job.responseUrl);
      const videoUrl = result.video?.url || result.data?.video?.url || result.output?.video?.url;
      return updateJob(job.id, {
        status: videoUrl ? "completed" : "failed",
        videoUrl: videoUrl || null,
        error: videoUrl ? null : "Модель завершила задачу, но ссылка на видео не найдена."
      });
    }
    if (remoteStatus === "FAILED") {
      return updateJob(job.id, { status: "failed", error: statusData.error || "Модель не смогла создать видео." });
    }
    return updateJob(job.id, { status: remoteStatus === "IN_PROGRESS" ? "processing" : "queued" });
  } catch (error) {
    console.error("fal status check failed:", error.message);
    return job;
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "VISION AI",
    generationEnabled: ENABLE_VIDEO_GENERATION && Boolean(FAL_KEY)
  });
});

app.get("/api/jobs", async (_req, res) => {
  let jobs = readJobs();
  const pending = jobs.filter(job => job.provider === "fal" && ["queued", "processing"].includes(job.status));
  for (const job of pending) await refreshFalJob(job);
  jobs = readJobs();
  res.json(jobs);
});

app.post("/api/generate", async (req, res) => {
  const prompt = String(req.body.prompt || "").trim();
  const style = String(req.body.style || "cinematic");
  const duration = Number(req.body.duration || 5);
  if (prompt.length < 5) return res.status(400).json({ error: "Опиши идею подробнее (минимум 5 символов)." });
  if (prompt.length > 1200) return res.status(400).json({ error: "Промпт слишком длинный. Максимум 1200 символов." });
  if (![5, 10].includes(duration)) return res.status(400).json({ error: "Выбери длительность 5 или 10 секунд." });

  if (!ENABLE_VIDEO_GENERATION || !FAL_KEY) {
    return res.status(503).json({
      error: "Реальная генерация пока выключена. Добавь FAL_KEY и ENABLE_VIDEO_GENERATION=true в Render после согласования бюджета."
    });
  }

  const stylePrompts = {
    cinematic: "Cinematic film look, dramatic lighting, professional camera movement.",
    realistic: "Photorealistic, natural lighting, realistic motion and textures.",
    anime: "High-quality anime visual style, expressive composition and fluid animation.",
    "3d": "High-quality 3D render, detailed materials, cinematic lighting.",
    fantasy: "Epic fantasy atmosphere, imaginative world, volumetric light.",
    documentary: "Documentary visual style, natural camera work, authentic atmosphere."
  };
  const finalPrompt = `${prompt}. Visual style: ${stylePrompts[style] || stylePrompts.cinematic}`;

  try {
    const accepted = await falFetch(`https://queue.fal.run/${FAL_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: finalPrompt,
        prompt_expansion_mode: "balanced",
        duration,
        resolution: "768P",
        aspect_ratio: "16:9",
        enable_safety_checker: true
      })
    });

    const job = {
      id: Date.now().toString(36),
      provider: "fal",
      requestId: accepted.request_id,
      statusUrl: accepted.status_url,
      responseUrl: accepted.response_url,
      cancelUrl: accepted.cancel_url,
      prompt,
      style,
      duration,
      status: "queued",
      createdAt: new Date().toISOString(),
      message: "Задача отправлена в очередь генерации."
    };
    const jobs = readJobs();
    jobs.unshift(job);
    writeJobs(jobs.slice(0, 50));
    res.status(202).json(job);
  } catch (error) {
    console.error("fal submission failed:", error.message);
    res.status(error.status && error.status < 500 ? error.status : 502).json({
      error: error.status === 402
        ? "На аккаунте fal.ai недостаточно доступных средств или возникло ограничение оплаты."
        : "Не удалось отправить видео на генерацию. Проверь настройки fal.ai и попробуй позже."
    });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`VISION AI running on port ${PORT}`));