// Calculator page controller — renders country-specific inputs,
// runs the deterministic engine, and optionally asks the Explainer Agent.

import { calculate, COUNTRIES } from "/js/rule-engine/index.js";

const $ = (id) => document.getElementById(id);
const countrySel = $("country");
const extras = $("extras");
const income = $("income");
const resultEl = $("result");
const explainBtn = $("explainBtn");
const aiExplainEl = $("aiExplain");

let lastResult = null;

function renderExtras(country) {
  const map = {
    IN: `
      <div class="field">
        <label>Regime</label>
        <select id="regime">
          <option value="new">New (default, FY 2025-26)</option>
          <option value="old">Old (with 80C etc.)</option>
        </select>
      </div>
      <div class="field">
        <label>80C deductions (only if old regime)</label>
        <input id="d80c" type="number" placeholder="max 150000" value="0"/>
      </div>`,
    US: `
      <div class="field">
        <label>Filing status</label>
        <select id="filing">
          <option value="single">Single</option>
          <option value="marriedJoint">Married filing jointly</option>
        </select>
      </div>
      <div class="field">
        <label>State</label>
        <select id="state">
          <option value="CA">California</option>
          <option value="NY">New York</option>
          <option value="TX">Texas</option>
          <option value="FL">Florida</option>
          <option value="WA">Washington</option>
        </select>
      </div>`,
    AE: `
      <div class="field">
        <label>Nationality</label>
        <select id="nationality">
          <option value="expat">Expat</option>
          <option value="UAE">UAE national</option>
          <option value="GCC">Other GCC national</option>
        </select>
      </div>`,
    SA: `
      <div class="field">
        <label>Nationality</label>
        <select id="nationality">
          <option value="expat">Expat</option>
          <option value="saudi">Saudi national</option>
        </select>
      </div>
      <div class="field">
        <label><input id="zakat" type="checkbox"/> Include indicative Zakat (2.5%)</label>
      </div>`,
    EG: ``,
    CA: `
      <div class="field">
        <label>Province</label>
        <select id="province">
          <option value="ON">Ontario</option>
          <option value="BC">British Columbia</option>
          <option value="AB">Alberta</option>
          <option value="QC">Quebec</option>
          <option value="NS">Nova Scotia</option>
        </select>
      </div>`,
    SG: `
      <div class="field">
        <label>Residency</label>
        <select id="residency">
          <option value="citizen">Citizen / PR (CPF applies)</option>
          <option value="foreigner">Foreigner (no CPF)</option>
        </select>
      </div>`,
    GB: ``, AU: ``, DE: ``, IE: ``, NL: ``, JP: ``, BR: ``, ZA: ``
  };
  extras.innerHTML = map[country] ?? "";
}

function collectPayload(country) {
  const grossAnnualIncome = Number(income.value) || 0;
  if (country === "IN") return { grossAnnualIncome, regime: $("regime").value, deductions80C: Number($("d80c").value) || 0 };
  if (country === "US") return { grossAnnualIncome, filing: $("filing").value, state: $("state").value };
  if (country === "AE") return { grossAnnualIncome, nationality: $("nationality").value };
  if (country === "SA") return { grossAnnualIncome, nationality: $("nationality").value, includeZakat: $("zakat").checked };
  if (country === "CA") return { grossAnnualIncome, province: $("province").value };
  if (country === "SG") return { grossAnnualIncome, residency: $("residency").value };
  return { grossAnnualIncome };
}

function fmt(n, currency) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function renderResult(r) {
  const sym = r.currency;
  const rows = (r.slabBreakdown || []).map(s => `
    <tr>
      <td>${fmt(s.from, sym)} – ${s.to === Infinity ? "∞" : fmt(s.to, sym)}</td>
      <td>${(s.rate * 100).toFixed(1)}%</td>
      <td>${fmt(s.tax, sym)}</td>
    </tr>`).join("");

  resultEl.innerHTML = `
    <div class="kpi">
      <div class="item danger"><div class="label">Total tax</div><div class="value">${fmt(r.totalTax, sym)}</div></div>
      <div class="item accent"><div class="label">Take home</div><div class="value">${fmt(r.takeHome, sym)}</div></div>
      <div class="item"><div class="label">Effective rate</div><div class="value">${r.effectiveRate}%</div></div>
    </div>
    ${rows ? `<table><thead><tr><th>Slab</th><th>Rate</th><th>Tax</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
    <div style="margin-top:10px">
      ${r.rebate87A ? `<span class="badge ok">87A rebate: ${fmt(r.rebate87A, sym)}</span> ` : ""}
      ${r.cess ? `<span class="badge">Cess: ${fmt(r.cess, sym)}</span> ` : ""}
      ${r.surcharge ? `<span class="badge">Surcharge: ${fmt(r.surcharge, sym)}</span> ` : ""}
      ${r.ficaSocialSecurity ? `<span class="badge">FICA SS: ${fmt(r.ficaSocialSecurity, sym)}</span> ` : ""}
      ${r.ficaMedicare ? `<span class="badge">Medicare: ${fmt(r.ficaMedicare, sym)}</span> ` : ""}
      ${r.stateTax ? `<span class="badge">State: ${fmt(r.stateTax, sym)}</span> ` : ""}
      ${r.gosiContribution ? `<span class="badge">GOSI: ${fmt(r.gosiContribution, sym)}</span> ` : ""}
      ${r.zakatIndicative ? `<span class="badge">Zakat: ${fmt(r.zakatIndicative, sym)}</span> ` : ""}
      ${r.pensionContribution ? `<span class="badge">GPSSA: ${fmt(r.pensionContribution, sym)}</span> ` : ""}
    </div>
    <p class="disclaimer">${r.disclaimer}</p>
  `;
  explainBtn.disabled = false;
  aiExplainEl.innerHTML = "";
}

async function onCalculate() {
  const country = countrySel.value;
  const payload = collectPayload(country);
  try {
    lastResult = calculate(country, payload);
    renderResult(lastResult);
  } catch (e) {
    resultEl.innerHTML = `<p style="color:var(--danger)">${e.message}</p>`;
  }
}

async function onExplain() {
  if (!lastResult) return;
  aiExplainEl.innerHTML = `<p class="loading">Explainer agent thinking…</p>`;
  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ result: lastResult })
    });
    const data = await res.json();
    if (data.error) {
      aiExplainEl.innerHTML = `<p class="disclaimer">AI explanation unavailable (${data.error}). Add <code>GROQ_API_KEY</code> to enable.</p>`;
      return;
    }
    aiExplainEl.innerHTML = `<div class="card" style="margin:0"><h3>AI explanation</h3><p>${data.explanation}</p></div>`;
  } catch (e) {
    aiExplainEl.innerHTML = `<p class="disclaimer">AI agent offline. Running locally without <code>vercel dev</code>? The math still works.</p>`;
  }
}

// Init
renderExtras(countrySel.value);
countrySel.addEventListener("change", () => renderExtras(countrySel.value));
$("calcBtn").addEventListener("click", onCalculate);
explainBtn.addEventListener("click", onExplain);

// Pre-fill from URL params (used by the Orchestrator's navigate action)
(function prefillFromUrl() {
  const p = new URLSearchParams(location.search);
  const c = (p.get("c") || "").toUpperCase();
  if (c && COUNTRIES[c]) {
    countrySel.value = c;
    renderExtras(c);
  }
  const i = p.get("i");
  if (i) income.value = i;
  const r = p.get("r");
  if (r) {
    const el = $("regime");
    if (el) el.value = r;
  }
  if (i) onCalculate();
})();

// Voice-driven calculate
window.addEventListener("voiceCalculate", (ev) => {
  const d = ev.detail || {};
  if (d.country) { countrySel.value = d.country; renderExtras(d.country); }
  if (d.income)  { income.value = d.income; }
  onCalculate();
});
