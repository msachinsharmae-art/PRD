// Multi-layer Compliance Explorer — Country → Jurisdiction (Federal/State/County) → Rule heads.

const CUR = { US: "$", IN: "₹", AE: "AED ", SA: "SAR ", EG: "EGP " };

const state = {
  country: localStorage.getItem("gt_country") || "US",
  tab: null,
  stateCode: null,
  search: ""
};

let data;
let usAllStates = null;
let knowledgeBase = null;
const topicsCache = {};

async function loadCountryTopics(code) {
  if (topicsCache[code] !== undefined) return topicsCache[code];
  try {
    const j = await fetch(`/data/compliance/${code.toLowerCase()}.json`).then(r => r.ok ? r.json() : null);
    topicsCache[code] = j;
    return j;
  } catch { topicsCache[code] = null; return null; }
}

async function boot() {
  [data, usAllStates, knowledgeBase] = await Promise.all([
    fetch("/data/compliance/jurisdictions.json").then(r => r.json()),
    fetch("/data/compliance/us-states-2026.json").then(r => r.json()).catch(() => null),
    fetch("/data/compliance/knowledge-base.json").then(r => r.ok ? r.json() : null).catch(() => null)
  ]);

  // Expose page context to AI drawer
  window.__GT_PAGE_CTX__ = () => {
    const c = data[state.country];
    if (!c) return { page: "compliance", country: state.country };
    const heads = state.tab === "state"
      ? (c.states?.find(s => s.code === state.stateCode)?.heads || c.states?.[0]?.heads)
      : (c.federal?.heads || c.central?.heads);
    return {
      page: "compliance",
      country: state.country,
      jurisdiction: c.label,
      tab: state.tab,
      state_code: state.stateCode,
      search: state.search,
      visible_heads: (heads || []).map(h => ({ id: h.id, title: h.title, legal: h.legal }))
    };
  };

  window.addEventListener("gt:country", (e) => { state.country = e.detail; state.tab = null; state.stateCode = null; render(); });
  document.getElementById("ceSearch").addEventListener("input", (e) => { state.search = e.target.value.toLowerCase(); render(); });
  render();
}

async function render() {
  const c = data[state.country];
  if (!c) { document.getElementById("ceContent").innerHTML = `<p class="muted">No data for ${state.country}. Pick another country from the topbar.</p>`; return; }

  const tabs = buildTabs(c);
  if (!state.tab || !tabs.find(t => t.id === state.tab)) state.tab = tabs[0].id;

  renderTabs(tabs);
  renderContent(c);

  // Quick-reference highlights — pulls from per-country topics file +
  // knowledge-base.json so every fact in the data folder is reachable from
  // the compliance page.
  const topics = await loadCountryTopics(state.country);
  renderHighlights(topics, knowledgeBase?.[state.country]);
}

function renderHighlights(topics, kb) {
  const host = document.getElementById("ceContent");
  if (!host) return;
  const haveTopics = topics?.topics?.length;
  const haveKb = kb && Object.keys(kb).length;
  if (!haveTopics && !haveKb) return;

  const topicCards = haveTopics ? topics.topics.map(t => `
    <div class="head-card" style="margin-bottom:8px">
      <h3 style="margin:0 0 4px;font-size:14px">${escape(t.title)}</h3>
      <p style="margin:0;font-size:13px;line-height:1.55;color:var(--text)">${escape(t.summary)}</p>
      ${t.source ? `<a href="${t.source}" target="_blank" rel="noopener" style="font-size:11.5px;color:var(--accent);font-weight:500">Source ↗</a>` : ""}
    </div>
  `).join("") : "";

  const kbCards = haveKb ? Object.entries(kb).slice(0, 12).map(([key, val]) => `
    <div class="head-card" style="margin-bottom:8px">
      <h3 style="margin:0 0 4px;font-size:13.5px;color:var(--accent);text-transform:uppercase;letter-spacing:0.04em;font-weight:700">${escape(key.replace(/_/g, " "))}</h3>
      ${renderKbObject(val)}
    </div>
  `).join("") : "";

  const html = `
    <details open style="margin-bottom:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;padding:12px 16px">
      <summary style="cursor:pointer;font-weight:700;font-size:14px">${escape(data[state.country].label)} — quick reference (${(haveTopics ? topics.topics.length : 0) + (haveKb ? Object.keys(kb).length : 0)} entries)</summary>
      <div style="margin-top:10px">
        ${topicCards}
        ${kbCards}
      </div>
    </details>
  `;
  // Prepend (rather than overwrite) so the existing tab content stays
  host.insertAdjacentHTML("afterbegin", html);
}

function renderKbObject(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string" || typeof v === "number") return `<p style="margin:0;font-size:12.5px;line-height:1.5;color:var(--text)">${escape(String(v))}</p>`;
  if (Array.isArray(v)) return `<p style="margin:0;font-size:12.5px;line-height:1.5;color:var(--text)">${v.map(x => escape(String(x))).join(", ")}</p>`;
  return `<div style="font-size:12.5px;line-height:1.55">${Object.entries(v).map(([k, x]) => `
    <div style="padding:2px 0"><b style="color:var(--muted);font-weight:500">${escape(k.replace(/_/g, " "))}:</b> ${typeof x === "object" && x !== null ? `<div style="margin-left:12px">${renderKbObject(x)}</div>` : escape(String(x))}</div>
  `).join("")}</div>`;
}

function escape(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function buildTabs(c) {
  const tabs = [];
  if (c.federal)  tabs.push({ id: "federal",  label: "Federal" });
  if (c.central)  tabs.push({ id: "central",  label: "Central" });
  if (state.country === "US" && usAllStates) tabs.push({ id: "all_states", label: "All 50 States + DC" });
  if (c.states && c.states.length) tabs.push({ id: "state", label: `State detail (${c.states.length})` });
  if (c.indiana_counties_2024)     tabs.push({ id: "counties_in", label: "Indiana 92 Counties" });
  if (c.free_zones) tabs.push({ id: "free_zones", label: "Free Zones" });
  return tabs;
}

function renderTabs(tabs) {
  const el = document.getElementById("ceTabs");
  el.innerHTML = tabs.map(t => `<div class="ce-tab ${t.id === state.tab ? "active" : ""}" data-tab="${t.id}">${t.label}</div>`).join("");
  el.querySelectorAll("[data-tab]").forEach(n => n.addEventListener("click", () => {
    state.tab = n.dataset.tab;
    state.stateCode = null;
    render();
    if (window.innerWidth <= 900) {
      const content = document.getElementById("ceContent");
      if (content) content.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }));
}

function renderContent(c) {
  const el = document.getElementById("ceContent");
  const tab = state.tab;

  if (tab === "federal" || tab === "central") {
    const src = c.federal || c.central;
    const title = c.federal ? `${c.label} — Federal` : `${c.label} — Central`;
    el.innerHTML = renderJurisdiction(src, title);
    return;
  }
  if (tab === "state") {
    el.innerHTML = renderStateTab(c);
    setTimeout(() => {
      document.querySelectorAll("[data-state]").forEach(n => n.addEventListener("click", () => { state.stateCode = n.dataset.state; render(); }));
    }, 0);
    return;
  }
  if (tab === "counties_in") {
    el.innerHTML = renderIndianaCounties(c.indiana_counties_2024);
    return;
  }
  if (tab === "all_states") {
    el.innerHTML = renderAllStates(usAllStates);
    return;
  }
  if (tab === "free_zones") {
    el.innerHTML = `<div class="jurisdiction-header"><h2>Free Zones</h2></div>` +
      c.free_zones.map(z => `<div class="head-card"><h3>${z.name}</h3><p>${z.note}</p></div>`).join("");
    return;
  }
}

function renderJurisdiction(src, title) {
  const heads = filterHeads(src.heads || []);
  return `
    <div class="jurisdiction-header">
      <h2>${title}</h2>
      <p><b>Authority:</b> ${src.authority || "—"}</p>
    </div>
    ${heads.map(renderHead).join("") || `<p class="muted">No matches.</p>`}
  `;
}

function renderStateTab(c) {
  const states = c.states || [];
  if (!state.stateCode) state.stateCode = states[0].code;
  const active = states.find(s => s.code === state.stateCode) || states[0];
  const heads = filterHeads(active.heads || []);
  const picker = `
    <div class="state-select">
      ${states.map(s => `<span class="chip ${state.stateCode === s.code ? "active" : ""}" data-state="${s.code}">${s.name}</span>`).join("")}
    </div>
  `;
  return `
    ${picker}
    <div class="jurisdiction-header">
      <h2>${active.name}</h2>
      <p><b>Authority:</b> ${active.authority || "—"}</p>
    </div>
    ${heads.map(renderHead).join("") || `<p class="muted">No matches.</p>`}
    ${active.local_min_wages_2026 ? renderLocalMinWages(active.local_min_wages_2026) : ""}
  `;
}

function filterHeads(heads) {
  if (!state.search) return heads;
  return heads.filter(h => JSON.stringify(h).toLowerCase().includes(state.search));
}

function renderHead(h) {
  const rows = [];
  const skip = new Set(["id", "title", "authority", "legal", "note"]);

  const pretty = (k) => k.replace(/_/g, " ").replace(/\b(\w)/g, m => m.toUpperCase()).replace(/Pit/, "PIT").replace(/Sui/, "SUI").replace(/Sdi/, "SDI").replace(/Ett/, "ETT").replace(/Mfj/, "MFJ").replace(/Hoh/, "HOH");
  const mon = (n) => typeof n === "number" ? (CUR[state.country] || "$") + n.toLocaleString("en") : n;

  for (const [k, v] of Object.entries(h)) {
    if (skip.has(k)) continue;
    if (Array.isArray(v)) {
      rows.push(`<div class="k">${pretty(k)}</div><div class="v">${renderArray(v)}</div>`);
    } else if (typeof v === "object" && v !== null) {
      rows.push(`<div class="k">${pretty(k)}</div><div class="v">${renderObject(v)}</div>`);
    } else {
      rows.push(`<div class="k">${pretty(k)}</div><div class="v"><b>${mon(v)}</b></div>`);
    }
  }

  return `
    <div class="head-card">
      <h3>${h.title}</h3>
      ${h.authority ? `<div class="auth">Authority: ${h.authority}</div>` : ""}
      ${h.legal ? `<div class="legal">📜 ${h.legal}</div>` : ""}
      ${h.note ? `<p style="color:var(--muted);font-size:12.5px;margin:0 0 10px">${h.note}</p>` : ""}
      <div class="field-grid">${rows.join("")}</div>
    </div>
  `;
}

function renderArray(arr) {
  if (!arr.length) return "—";
  if (typeof arr[0] === "string") return arr.join(", ");
  const keys = [...new Set(arr.flatMap(x => Object.keys(x)))];
  return `
    <div style="overflow-x:auto">
      <table class="sub-table">
        <thead><tr>${keys.map(k => `<th>${k.replace(/_/g," ")}</th>`).join("")}</tr></thead>
        <tbody>${arr.map(row => `<tr>${keys.map(k => `<td>${formatCell(row[k])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderObject(o) {
  return Object.entries(o).map(([k, v]) =>
    `<div style="margin-bottom:3px"><b style="color:var(--muted);font-weight:500">${k.replace(/_/g," ")}:</b> ${formatCell(v)}</div>`
  ).join("");
}

function formatCell(v) {
  if (v === undefined || v === null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "number" && v > 1000) return (CUR[state.country] || "$") + v.toLocaleString("en");
  return String(v);
}

function renderLocalMinWages(list) {
  return `
    <div class="head-card">
      <h3>Local City Minimum Wages (2026)</h3>
      <div class="auth">City-level minimums above the state floor</div>
      <table class="sub-table">
        <thead><tr><th>City</th><th style="text-align:right">Min wage / hr</th></tr></thead>
        <tbody>${list.sort((a,b) => b.rate - a.rate).map(l => `<tr><td>${l.city}</td><td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:600">$${l.rate.toFixed(2)}</td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderIndianaCounties(county) {
  const rates = county.list;
  const min = Math.min(...rates.map(r => r.rate));
  const max = Math.max(...rates.map(r => r.rate));
  const avg = rates.reduce((a, x) => a + x.rate, 0) / rates.length;
  const filtered = state.search
    ? rates.filter(r => r.county.toLowerCase().includes(state.search) || (r.cities || "").toLowerCase().includes(state.search))
    : rates;
  return `
    <div class="jurisdiction-header">
      <h2>Indiana — 92 County Income Tax Rates (2026)</h2>
      <p>${county.note}</p>
      <p style="margin-top:10px"><b>Range:</b> ${(min*100).toFixed(4)}% (Porter) to ${(max*100).toFixed(4)}% (Pulaski) · <b>Average:</b> ${(avg*100).toFixed(2)}%</p>
      <p><b>2026 changes:</b> Hamilton +0.10% · Monroe +0.69% (51% increase) · Tippecanoe −0.06%. All other 89 counties unchanged from 2024.</p>
      <p><b>State rate:</b> 2.90% flat (down from 3.05% in 2024, accelerated under SB 451/2025).</p>
    </div>
    <div class="head-card">
      <h3>Search / browse — ${filtered.length} of ${rates.length} counties</h3>
      <div class="county-table">
        <table>
          <thead><tr><th>#</th><th>County</th><th>Major city</th><th style="text-align:right">Rate (2026)</th><th>2026 change</th></tr></thead>
          <tbody>${filtered.map((r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r.county}</td>
              <td class="muted">${r.cities || "—"}</td>
              <td class="rate ${r.rate === min ? "low" : r.rate === max ? "high" : ""}">${(r.rate * 100).toFixed(4)}%</td>
              <td>${r.change_2026 ? `<span class="change-pill ${r.change_2026.startsWith("+") ? "up" : "down"}">${r.change_2026}</span>` : ""}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAllStates(kb) {
  if (!kb) return `<p class="muted">Data not loaded.</p>`;
  const states = kb.states;
  const filtered = state.search
    ? states.filter(s => JSON.stringify(s).toLowerCase().includes(state.search))
    : states;
  const pitCounts = states.reduce((a, s) => {
    if (s.flat_or_progressive === "none") a.none++;
    else if (s.flat_or_progressive === "flat") a.flat++;
    else a.progressive++;
    return a;
  }, { none: 0, flat: 0, progressive: 0 });
  return `
    <div class="jurisdiction-header">
      <h2>US — All 50 States + DC · Payroll Tax Summary 2026</h2>
      <p>${kb.meta.note}</p>
      <p style="margin-top:10px"><b>Coverage:</b> ${pitCounts.none} no-income-tax states · ${pitCounts.flat} flat-tax states · ${pitCounts.progressive} progressive states. Source: state DOR/DOL pages + Tax Foundation 2026 summary.</p>
    </div>
    <div class="head-card">
      <h3>State-by-state — ${filtered.length} of ${states.length}</h3>
      <div class="county-table">
        <table>
          <thead><tr>
            <th>#</th><th>State</th><th>Income Tax</th><th>Type</th>
            <th style="text-align:right">SUI wage base</th><th style="text-align:right">Min wage 2026</th><th>Notable</th>
          </tr></thead>
          <tbody>${filtered.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><b>${s.code}</b> · ${s.name}</td>
              <td>${s.income_tax}</td>
              <td><span class="change-pill ${s.flat_or_progressive === "none" ? "down" : s.flat_or_progressive === "progressive" ? "up" : ""}" style="background:var(--surface-2);color:var(--muted)">${s.flat_or_progressive}</span></td>
              <td class="rate">$${s.sui_wage_base.toLocaleString("en")}</td>
              <td class="rate">$${s.min_wage_2026.toFixed(2)}</td>
              <td style="font-size:11.5px;color:var(--muted);max-width:360px">${s.notable}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

boot().catch(e => {
  document.getElementById("ceContent").innerHTML = `<p class="muted">Failed to load: ${e.message}</p>`;
});
