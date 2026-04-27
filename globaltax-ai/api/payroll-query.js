// Payroll Query Agent — takes a natural-language dashboard question plus the
// current dashboard context (country, months, aggregated trend) and returns a
// structured intent + a narration. The dashboard applies deterministic JS
// locally for anything numeric; the LLM only narrates, never recomputes.

import { llama, MODELS, jsonResponse, parseBody } from "./_llama.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Load knowledge base once at module import (cached across cold-start)
let KB_TEXT = "";
try {
  const kb = JSON.parse(readFileSync(join(process.cwd(), "public", "data", "compliance", "knowledge-base.json"), "utf-8"));
  KB_TEXT = JSON.stringify(kb, null, 0);
} catch (e) {
  KB_TEXT = "";
}

const SYSTEM = `You are the Compliance & Payroll Assistant for GlobalTax.AI — an HR dashboard covering India, US, UAE, KSA, Egypt.

You receive { question, context } where context may contain:
  country        — one of IN, US, AE, SA, EG
  page           — current URL path
  months, latest, trend  — dashboard payroll aggregates (when on /dashboard)
  pageContent    — JSON summary of whatever is on screen (when the page exposes it)

Return STRICT JSON: { "intent": string, "narration": string }

Answering rules:
- BE HELPFUL. The user is a payroll/HR admin or employee asking real questions. Default to answering, not deflecting.
- If the question is about labour codes, perquisites, GOSI, GPSSA, EPF, gratuity, ESI, HRA, bonus, LWF, PT, minimum wages, withholding, FICA, Social Security, SUTA, VAT, corporate tax, WPS, FNF, or ANY payroll/tax/compliance topic for the 5 supported countries — ANSWER directly with the applicable rules and current rates. Cite the act/section.
- If numbers are in context, quote them verbatim. If they're not, use your general knowledge confidently (stating "approximate" if uncertain).
- For calculation requests ("tax on 13 LPA"), walk through slab-by-slab if helpful; or state the answer succinctly.
- Currency: ₹ (IN), $ (US), AED (AE), SAR (SA), EGP (EG). Indian amounts in lakh/crore.
- Keep narration 1-4 sentences unless breakdown is requested.
- Choose intent from: "answer" (most common), "compute", "compare", "navigate", "clarify" (only when you genuinely need more info).

Never refuse a payroll/tax/compliance question. Never recommend "visiting a government website" without first giving the answer.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return jsonResponse(res, { error: "POST only" }, 405);
  const { question = "", context = {} } = await parseBody(req);
  if (!question) return jsonResponse(res, { error: "no question" }, 400);

  try {
    // Attach knowledge base if the question seems to need it (heuristic: any compliance keyword)
    const needsKB = /tax|compliance|payroll|pf|epf|esi|gosi|gpssa|zakat|vat|gst|tds|fica|futa|salt|obbba|labour|wage|gratuity|nitaqat|pillar|nosi|qfzp|zatca|difc|adgm/i.test(question);
    const userMsg = needsKB && KB_TEXT
      ? `Question: "${question}"\nContext: ${JSON.stringify(context)}\n\nAuthoritative knowledge base (cite it when relevant): ${KB_TEXT.slice(0, 12000)}`
      : `Question: "${question}"\nContext: ${JSON.stringify(context)}`;
    const out = await llama({
      system: SYSTEM,
      user: userMsg,
      model: MODELS.smart,
      json: true
    });
    return jsonResponse(res, out);
  } catch (e) {
    // Graceful fallback: if no GROQ_API_KEY, we can at least echo a trend summary
    // so the UI shows something useful without the AI.
    const trend = Array.isArray(context.trend) ? context.trend : [];
    const last = trend[trend.length - 1];
    const narration = last
      ? `AI offline — last month: headcount ${last.headcount}, gross ${last.gross}, net ${last.netPay}. Configure GROQ_API_KEY for natural-language answers.`
      : `AI offline. Configure GROQ_API_KEY and reload.`;
    return jsonResponse(res, { intent: "smalltalk", narration, error: e.message });
  }
}
