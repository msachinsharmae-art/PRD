// Orchestrator Agent — classifies intent, routes to the right specialist agent,
// returns a unified reply + optional agentic action (navigate / calculate).

import { llama, MODELS, jsonResponse, parseBody } from "./_llama.js";

const SYSTEM = `You are the Orchestrator for a multi-country tax assistant (India, US, UAE, Saudi Arabia, Egypt).

Your job: read the user's utterance and classify it into ONE intent, then extract useful slots.

Return STRICT JSON with this shape:
{
  "intent": "calculate" | "compliance" | "updates" | "compare" | "smalltalk",
  "country": "IN" | "US" | "AE" | "SA" | "EG" | null,
  "income": number | null,
  "regime": "new" | "old" | null,
  "filing": "single" | "marriedJoint" | null,
  "state": string | null,
  "question": string | null,
  "reply": string
}

Rules:
- Convert "lakh" and "crore" for India: 1 lakh = 100000, 1 crore = 10000000.
- If the user just greets, intent = "smalltalk", reply is a short friendly guide.
- "reply" is what you'll say/show — keep it under 2 sentences. Don't compute tax — a deterministic engine does that.
- If intent is "calculate" but income is missing, ask for it in "reply".`;

export default async function handler(req, res) {
  if (req.method !== "POST") return jsonResponse(res, { error: "POST only" }, 405);
  const { utterance = "", page = "" } = await parseBody(req);
  if (!utterance) return jsonResponse(res, { error: "no utterance" }, 400);

  try {
    const routed = await llama({
      system: SYSTEM,
      user: `User said: "${utterance}"\nCurrent page: ${page}`,
      model: MODELS.smart,
      json: true
    });

    // Build an agentic action where appropriate
    let action = null;
    if (routed.intent === "calculate" && routed.country && routed.income) {
      action = {
        type: "navigate",
        url: `/calculator.html?c=${routed.country}&i=${routed.income}${routed.regime ? `&r=${routed.regime}` : ""}`
      };
    } else if (routed.intent === "compliance" && routed.country) {
      action = { type: "navigate", url: `/compliance.html?c=${routed.country}` };
    } else if (routed.intent === "updates") {
      action = { type: "navigate", url: `/updates.html${routed.country ? `?c=${routed.country}` : ""}` };
    } else if (routed.intent === "compare") {
      action = { type: "navigate", url: `/compare.html` };
    }

    return jsonResponse(res, {
      intent: routed.intent,
      country: routed.country,
      slots: routed,
      reply: routed.reply,
      spoken: routed.reply,
      action
    });
  } catch (e) {
    return jsonResponse(res, { error: e.message }, 500);
  }
}
