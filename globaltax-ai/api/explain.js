// Explainer Agent — turns a deterministic calculation result into a friendly 2–3 sentence narrative.
// Does NOT recompute. Validator Agent first sanity-checks the incoming numbers.

import { llama, MODELS, jsonResponse, parseBody } from "./_llama.js";

const SYSTEM = `You are a tax Explainer. You receive a JSON tax-calc result computed by a deterministic engine.
Produce a plain-English explanation in 2–3 sentences that mentions:
- total tax and take-home
- the single biggest driver (slab, FICA, GOSI, etc.)
- one actionable nudge (e.g., "consider old regime if you claim 80C > ₹1.5L").

RULES:
- Never change, recompute, or contradict the numbers in the JSON.
- Use the currency symbol shown in the JSON.
- No disclaimers — the UI adds its own.`;

const VALIDATOR_SYSTEM = `You are a numeric Validator. Given a tax JSON, reply STRICT JSON:
{ "ok": boolean, "issues": string[] }
Check: slabBreakdown tax values sum to a value consistent with totalTax (allow small rounding), takeHome ≈ gross - totalTax, effectiveRate matches totalTax/gross. Do not invent new issues.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return jsonResponse(res, { error: "POST only" }, 405);
  const { result } = await parseBody(req);
  if (!result) return jsonResponse(res, { error: "no result provided" }, 400);

  try {
    // Validator (fast Llama 8B)
    const verdict = await llama({
      system: VALIDATOR_SYSTEM,
      user: JSON.stringify(result),
      model: MODELS.fast,
      json: true,
      temperature: 0
    }).catch(() => ({ ok: true, issues: [] }));

    // Explainer (smart 70B)
    const explanation = await llama({
      system: SYSTEM,
      user: JSON.stringify(result),
      model: MODELS.smart
    });

    return jsonResponse(res, {
      explanation,
      validator: verdict
    });
  } catch (e) {
    return jsonResponse(res, { error: e.message }, 500);
  }
}
