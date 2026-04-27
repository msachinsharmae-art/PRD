# GlobalTax AI

Multi-country income tax calculator, compliance guide, live regulatory-updates feed, and a voice-enabled AI assistant — built on a multi-agent architecture.

Countries: 🇮🇳 India • 🇺🇸 US • 🇦🇪 UAE • 🇸🇦 Saudi Arabia • 🇪🇬 Egypt.

## Why the design looks the way it does

**Tax math is deterministic code, not an LLM.** Every calculator is a plain JS rule-file per country under `public/js/rule-engine/`. The LLM agents never recompute — they only explain, route, or fetch. This is the single most important architectural decision: it means no hallucinated slabs or invented rebates.

## Architecture

```
         ┌──────── USER (text / voice) ────────┐
                         │
                  VOICE LAYER  (Web Speech API)
                         │
              ORCHESTRATOR AGENT  (Llama 3.3 70B)
                         │
       ┌───────┬─────────┼──────────┬─────────┐
       ▼       ▼         ▼          ▼         ▼
  CALCULATOR  COMPLIANCE  UPDATES   COMPARE   EXPLAINER
  (rule eng.) (RAG brief) (search) (rules)   (narrative)
       │       │         │          │         │
       └───────┴────┬────┴──────────┴─────────┘
                    ▼
              VALIDATOR AGENT  (Llama 3.1 8B — fast)
                    │
                    ▼
               RESPONSE TO USER
```

Each agent lives in `api/` as a Vercel serverless function:
- `api/orchestrate.js` — intent routing + agentic navigation actions
- `api/explain.js` — Explainer + Validator (numeric sanity)
- `api/compliance.js` — RAG over per-country briefs + Validator (citation check)
- `api/updates.js` — Live feed (Tavily search + Llama summarization) with seeded fallback

## Free stack

| Layer | Service | Cost |
|---|---|---|
| Frontend hosting | Vercel (or Cloudflare Pages / Netlify) | Free |
| Serverless API | Vercel Functions | Free tier |
| LLM | **Groq** — Llama 3.3 70B | Free tier |
| Search for Updates Agent | Tavily | Free tier |
| Voice STT + TTS | Browser Web Speech API | $0 |
| Domain | `*.vercel.app` free; or `.xyz` at Porkbun ~$1/yr | Free / ~$1 |

## Run locally

```bash
# 1. Install
npm install -g vercel
npm install

# 2. Get keys
#    Groq (required for AI): https://console.groq.com
#    Tavily (optional, for live updates fetch): https://tavily.com
cp .env.example .env.local
#    edit .env.local and paste your keys

# 3. Dev
vercel dev
# opens http://localhost:3000
```

Without any API keys you still get: calculator for all 5 countries, compare page, static compliance briefs, seeded updates feed, voice UI (STT/TTS). The AI-powered responses (orchestrator, explainer, compliance Q&A, live feed refresh) simply show a graceful "AI unavailable" message.

## Deploy to a free domain

```bash
vercel login
vercel            # first deploy → preview URL (free)
vercel --prod     # production → your-project.vercel.app (free, HTTPS, custom domain supported)
```

Set env vars in the Vercel dashboard: `Project → Settings → Environment Variables → GROQ_API_KEY, TAVILY_API_KEY`.

To use a custom domain: buy a `.xyz` / `.online` at Porkbun (~$1/year) and add it in Vercel → Domains. Or keep `*.vercel.app` free forever.

## Countries & rule-file coverage

| Country | What's modeled | Notes |
|---|---|---|
| India | New regime FY 25-26 slabs, old regime, 80C, 87A rebate, surcharge, cess, standard deduction | Covers 95% of salaried cases |
| US | 2025 federal brackets (single / MFJ), FICA (SS + Medicare), simplified state (CA/NY/TX/FL/WA) | Real product: expand state coverage |
| UAE | 0% income tax, GPSSA pension for nationals | VAT/CT are explained in compliance brief |
| Saudi Arabia | 0% income tax, GOSI by nationality, indicative Zakat | — |
| Egypt | Progressive slabs 0-27.5%, personal exemption | Uses standard progressive convention |

## Extending this

Patterns already in place — copy-paste and extend:

1. **Add a country** — drop a new rule file in `public/js/rule-engine/`, register it in `index.js`, add a compliance brief in `public/data/compliance/`, add to the country selectors. That's it.
2. **Add an agent** — create `api/<name>.js` using the `_llama.js` helper. Add a new intent to the orchestrator's `SYSTEM` prompt.
3. **Swap the LLM** — change `MODELS.smart` / `MODELS.fast` in `api/_llama.js`. Works with any Llama variant on Groq.
4. **Payslip upload** — next logical feature: `api/extract.js` using a vision-capable Llama or a separate VLM to read a PDF payslip → feed into the calculator.

## Phased roadmap (PM-view)

- **V0.1 ✅** — 5-country calculator, deterministic
- **V0.5 ✅** — Compliance guide + updates feed + orchestrator + explainer + voice
- **V1.0** — Live updates via scheduled cron + email/WhatsApp alerts
- **V1.5** — Payslip PDF upload + VLM extract
- **V2.0** — Embeddable widget for HR/payroll SaaS (B2B angle)
- **V2.5** — WhatsApp bot on same agent brain

## Disclaimer

Informational only. Not tax or legal advice. Verify with a qualified professional before making decisions.
