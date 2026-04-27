// Ask-Anything controller — pipes free-text question through the Orchestrator,
// shows the reply + any agentic action (navigate, calc pre-fill).

const $ = (id) => document.getElementById(id);

async function ask(utterance) {
  const q = utterance.trim();
  if (!q) return;
  $("q").value = q;
  $("answer").style.display = "block";
  $("answerBody").innerHTML = `<p class="loading">Orchestrator routing…</p>`;
  $("answerAction").innerHTML = "";

  try {
    const res = await fetch("/api/orchestrate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ utterance: q, page: "/ask" })
    });
    const data = await res.json();
    if (data.error) {
      $("answerBody").innerHTML = `<p class="disclaimer">AI unavailable (${data.error}).</p>`;
      return;
    }

    $("answerBody").innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
        <span class="badge">intent: ${data.intent}</span>
        ${data.country ? `<span class="badge ok">${data.country}</span>` : ""}
      </div>
      <p style="font-size:1.05rem;line-height:1.55">${data.reply || ""}</p>
    `;

    if (data.action?.type === "navigate") {
      $("answerAction").innerHTML = `
        <a class="btn" href="${data.action.url}">Open ${labelFor(data.action.url)} →</a>
      `;
    }
  } catch (e) {
    $("answerBody").innerHTML = `<p class="disclaimer">Orchestrator offline. Try again in a moment.</p>`;
  }
}

function labelFor(url) {
  if (url.includes("calculator")) return "Calculator";
  if (url.includes("compliance"))  return "Compliance";
  if (url.includes("updates"))     return "Updates";
  if (url.includes("compare"))     return "Compare";
  return "page";
}

$("askBtn").addEventListener("click", () => ask($("q").value));
$("q").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask($("q").value);
});

document.querySelectorAll(".chip[data-sample]").forEach(ch => {
  ch.addEventListener("click", () => ask(ch.dataset.sample));
});

// Deep-link support: /ask.html?q=...
(function fromUrl() {
  const q = new URLSearchParams(location.search).get("q");
  if (q) ask(q);
})();
