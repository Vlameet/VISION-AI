const form = document.querySelector("#generate-form");
const promptInput = document.querySelector("#prompt");
const counter = document.querySelector("#counter");
const feedback = document.querySelector("#feedback");
const submit = document.querySelector("#submit");
const jobsEl = document.querySelector("#jobs");
const countEl = document.querySelector("#job-count");

promptInput.addEventListener("input", () => {
  counter.textContent = promptInput.value.length + " / 1200";
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function renderJobs(jobs) {
  countEl.textContent = jobs.length + (jobs.length === 1 ? " PROJECT" : " PROJECTS");
  if (!jobs.length) {
    jobsEl.innerHTML = '<div class="empty">Пока здесь пусто. Первая идея может всё изменить.</div>';
    return;
  }
  jobsEl.innerHTML = jobs.map(job => `
    <article class="job">
      <span class="job-tag">DEMO PROJECT · ${escapeHtml(job.style.toUpperCase())}</span>
      <p>${escapeHtml(job.prompt)}</p>
      <small>${new Date(job.createdAt).toLocaleString("ru-RU")} · ${job.duration} сек.</small>
      <p class="job-tag">${escapeHtml(job.message)}</p>
    </article>`).join("");
}
async function loadJobs() {
  try {
    const response = await fetch("/api/jobs");
    if (!response.ok) throw new Error("Не удалось загрузить проекты");
    renderJobs(await response.json());
  } catch (error) {
    jobsEl.innerHTML = '<div class="empty">Не удалось загрузить историю проектов.</div>';
  }
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  feedback.textContent = "";
  submit.disabled = true;
  submit.querySelector("span").textContent = "Подготавливаем...";
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        prompt: promptInput.value,
        style: document.querySelector("#style").value,
        duration: Number(document.querySelector("#duration").value)
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Ошибка запроса");
    feedback.textContent = result.message;
    promptInput.value = "";
    counter.textContent = "0 / 1200";
    await loadJobs();
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    submit.disabled = false;
    submit.querySelector("span").textContent = "Подготовить генерацию";
  }
});
loadJobs();