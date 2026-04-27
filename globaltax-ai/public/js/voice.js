// Voice layer — Web Speech API for STT + TTS (zero external cost).
// Pipes transcripts to the Orchestrator Agent and speaks back the response.

const $ = (id) => document.getElementById(id);
const fab = $("voiceFab");
const panel = $("voicePanel");
const log = $("voiceLog");
const closeBtn = $("voiceClose");

if (!fab) {
  // Voice UI not present on this page
} else {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synth = window.speechSynthesis;

  let recog = null;
  let listening = false;

  function speak(text) {
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    synth.cancel();
    synth.speak(u);
  }

  function append(who, text) {
    const row = document.createElement("div");
    row.className = who;
    row.innerHTML = `<strong>${who === "me" ? "You" : "AI"}:</strong> ${text}`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function openPanel() { panel.classList.add("open"); }
  function closePanel() { panel.classList.remove("open"); if (recog) recog.abort(); }

  async function ask(text) {
    append("me", text);
    append("ai", "<em>thinking…</em>");
    try {
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ utterance: text, page: location.pathname })
      });
      const data = await res.json();
      log.lastChild.remove();
      const reply = data.spoken || data.reply || "Sorry, no response.";
      append("ai", reply);
      speak(reply);
      if (data.action) handleAction(data.action);
    } catch (e) {
      log.lastChild.remove();
      append("ai", "I'm offline right now. Run <code>vercel dev</code> and set GROQ_API_KEY to enable me.");
    }
  }

  function handleAction(action) {
    // Agentic action — navigate or trigger calculator
    if (action.type === "navigate" && action.url) location.href = action.url;
    if (action.type === "calculate" && location.pathname.endsWith("/calculator")) {
      const ev = new CustomEvent("voiceCalculate", { detail: action });
      window.dispatchEvent(ev);
    }
  }

  function startListen() {
    if (!SR) {
      append("ai", "Your browser doesn't support speech recognition. Try Chrome/Edge.");
      openPanel();
      return;
    }
    openPanel();
    recog = new SR();
    recog.lang = "en-US";
    recog.interimResults = false;
    recog.continuous = false;
    recog.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      ask(text);
    };
    recog.onerror = (e) => append("ai", `Mic error: ${e.error}`);
    recog.onend = () => { listening = false; fab.classList.remove("listening"); };
    recog.start();
    listening = true;
    fab.classList.add("listening");
  }

  fab.addEventListener("click", () => {
    if (!panel.classList.contains("open")) { openPanel(); }
    if (listening) { recog.abort(); }
    else { startListen(); }
  });
  closeBtn?.addEventListener("click", closePanel);
}
