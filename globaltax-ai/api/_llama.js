// Thin Groq/Llama client — shared by every agent.
// Free Llama 3.3 70B via https://console.groq.com

import Groq from "groq-sdk";

let client = null;
function getClient() {
  if (!process.env.GROQ_API_KEY) return null;
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

export const MODELS = {
  smart: "llama-3.3-70b-versatile", // orchestration, compliance, explainer
  fast:  "llama-3.1-8b-instant"     // validator, simple classifiers
};

/**
 * Ask Llama. Pass { system, user, model, json } — returns the text (or parsed JSON).
 */
export async function llama({ system, user, model = MODELS.smart, json = false, temperature = 0.2 }) {
  const c = getClient();
  if (!c) throw new Error("GROQ_API_KEY not configured");
  const res = await c.chat.completions.create({
    model,
    temperature,
    response_format: json ? { type: "json_object" } : undefined,
    messages: [
      { role: "system", content: system },
      { role: "user",   content: user }
    ]
  });
  const text = res.choices?.[0]?.message?.content ?? "";
  return json ? JSON.parse(text) : text;
}

export function jsonResponse(res, data, status = 200) {
  res.status(status).setHeader("content-type", "application/json").send(JSON.stringify(data));
}

export function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    let raw = "";
    req.on("data", (c) => raw += c);
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); }
    });
  });
}
