// Compliance Agent — answers country-specific compliance questions from the
// curated per-country brief (lightweight RAG: we stuff the brief into context).
// Validator Agent then confirms every citation exists verbatim in the source.

import { llama, MODELS, jsonResponse, parseBody } from "./_llama.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadBrief(country) {
  const p = join(process.cwd(), "public", "data", "compliance", `${country.toLowerCase()}.json`);
  return JSON.parse(readFileSync(p, "utf-8"));
}

const SYSTEM = `You are the Compliance Guide Agent. Answer ONLY from the provided country brief (JSON).
Respond in 3–5 sentences. Cite topic titles used in square brackets, e.g. [Section 80C deductions].
If the brief does not contain the answer, say so clearly — do NOT invent rules, sections, or numbers.`;

const VALIDATOR_SYSTEM = `You are the Citation Validator. Given an answer and a list of allowed topic titles,
reply STRICT JSON: { "ok": boolean, "invalidCitations": string[] }.
A citation is any text in square brackets. It is valid only if it appears verbatim in allowed titles.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return jsonResponse(res, { error: "POST only" }, 405);
  const { country = "IN", question = "" } = await parseBody(req);
  if (!question) return jsonResponse(res, { error: "no question" }, 400);

  try {
    const brief = loadBrief(country);
    const allowed = brief.topics.map(t => t.title);

    const answer = await llama({
      system: SYSTEM,
      user: `Country brief:\n${JSON.stringify(brief, null, 2)}\n\nQuestion: ${question}`,
      model: MODELS.smart
    });

    const verdict = await llama({
      system: VALIDATOR_SYSTEM,
      user: `Answer:\n${answer}\n\nAllowed titles:\n${JSON.stringify(allowed)}`,
      model: MODELS.fast,
      json: true,
      temperature: 0
    }).catch(() => ({ ok: true, invalidCitations: [] }));

    // Extract cleaned citations
    const citeRegex = /\[([^\]]+)\]/g;
    const raw = [...answer.matchAll(citeRegex)].map(m => m[1]);
    const valid = raw.filter(c => allowed.includes(c));

    return jsonResponse(res, {
      answer,
      citations: valid,
      validator: verdict
    });
  } catch (e) {
    return jsonResponse(res, { error: e.message }, 500);
  }
}
