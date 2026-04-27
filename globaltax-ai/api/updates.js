// Updates Agent — reads the seeded feed from /public/data/updates.json
// and (optionally, when ?refresh=1 and TAVILY_API_KEY is set) fetches fresh
// regulatory items via Tavily search, summarizes them with Llama, and merges.

import { llama, MODELS, jsonResponse } from "./_llama.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const COUNTRY_QUERIES = {
  IN: "India income tax new regime change 2025 site:incometax.gov.in OR site:indiabudget.gov.in",
  US: "IRS 2025 tax bracket change site:irs.gov OR site:ssa.gov",
  AE: "UAE corporate tax VAT 2025 site:tax.gov.ae",
  SA: "Saudi Arabia GOSI Zakat VAT 2025 site:zatca.gov.sa OR site:gosi.gov.sa",
  EG: "Egypt income tax law 2024 2025 site:eta.gov.eg"
};

async function tavilySearch(query) {
  if (!process.env.TAVILY_API_KEY) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: "basic",
      max_results: 3,
      include_answer: false
    })
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

async function summarizeHit(country, hit) {
  try {
    const summary = await llama({
      system: `You summarize a regulatory page into one sentence (max 35 words) focused on what *changed* or *takes effect*. Output plain text only.`,
      user: `Title: ${hit.title}\nURL: ${hit.url}\nContent: ${hit.content}`,
      model: MODELS.fast,
      temperature: 0
    });
    return {
      country,
      date: new Date().toISOString().slice(0, 10),
      category: "Fetched",
      title: hit.title.slice(0, 120),
      summary,
      source: hit.url
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const country = (url.searchParams.get("country") || "ALL").toUpperCase();
  const refresh = url.searchParams.get("refresh") === "1";

  // Base seeded feed always loads
  const seedPath = join(process.cwd(), "public", "data", "updates.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf-8"));
  let items = seed.items;

  if (refresh && process.env.TAVILY_API_KEY && process.env.GROQ_API_KEY) {
    const countries = country === "ALL" ? Object.keys(COUNTRY_QUERIES) : [country];
    for (const c of countries) {
      const hits = await tavilySearch(COUNTRY_QUERIES[c] || "");
      const summaries = (await Promise.all(hits.map(h => summarizeHit(c, h)))).filter(Boolean);
      items = [...summaries, ...items];
    }
  }

  if (country !== "ALL") items = items.filter(i => i.country === country);

  // Dedupe by source URL
  const seen = new Set();
  items = items.filter(i => (i.source && !seen.has(i.source) && seen.add(i.source)) || !i.source);

  return jsonResponse(res, { items, refreshed: refresh });
}
