// Labour Code page — renders the Old Acts vs New Codes comparison + impact calculator.

import { splitWages } from "/js/rule-engine/india-payroll/wages.js";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n) => INR.format(n || 0);

let data = null;
let activeCode = "wages";

async function boot() {
  const res = await fetch("/data/labour-codes/india.json");
  data = await res.json();
  document.getElementById("lcStatus").textContent = data.meta.status_note;

  // Expose page context to AI drawer
  window.__GT_PAGE_CTX__ = () => ({
    page: "labour-code",
    country: "IN",
    active_code: activeCode,
    codes_summary: data.codes.map(c => ({
      id: c.id,
      name: c.short,
      replaces_count: c.replaces.length,
      biggest_impact: c.biggest_impact,
      effective: c.effective
    })),
    impact_summary: data.impact_summary
  });

  renderTabs();
  renderCode(activeCode);
  renderImpactStrip();
  wireCalc();
  runCalc();
}

function renderTabs() {
  const bar = document.getElementById("codeTabs");
  bar.innerHTML = data.codes.map(c =>
    `<div class="code-tab ${c.id === activeCode ? "active" : ""}" data-id="${c.id}">${c.short}</div>`
  ).join("");
  bar.querySelectorAll(".code-tab").forEach(t => {
    t.addEventListener("click", () => {
      activeCode = t.dataset.id;
      bar.querySelectorAll(".code-tab").forEach(x => x.classList.toggle("active", x.dataset.id === activeCode));
      renderCode(activeCode);
      if (window.innerWidth <= 900) {
        const detail = document.getElementById("codeDetail");
        if (detail) detail.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function renderCode(id) {
  const c = data.codes.find(x => x.id === id);
  const detail = document.getElementById("codeDetail");
  detail.innerHTML = `
    <div class="code-block">
      <h2>${c.name}</h2>
      <div class="replaces">Replaces: ${c.replaces.map(r => `<b>${r}</b>`).join(" · ")}</div>
      <div class="replaces"><b>Status:</b> ${c.effective}</div>
      <div class="biggest"><b>Biggest impact:</b> ${c.biggest_impact}</div>
      <table class="diff-table">
        <thead>
          <tr><th>Topic</th><th>Old (pre-Code)</th><th>New (Code)</th><th>Business impact</th></tr>
        </thead>
        <tbody>
          ${c.key_changes.map(k => `
            <tr>
              <td class="topic">${k.topic}<span class="section">${k.section || ""}</span></td>
              <td class="old">${escape(k.old)}</td>
              <td class="new">${escape(k.new)}</td>
              <td class="impact">${escape(k.impact)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderImpactStrip() {
  const strip = document.getElementById("impactStrip");
  const s = data.impact_summary;
  const tiles = [
    { title: "For the Employer", items: s.for_employer },
    { title: "For the Employee", items: s.for_employee },
    { title: "For Payroll / HR Tech", items: s.for_payroll_tech }
  ];
  strip.innerHTML = tiles.map(t => `
    <div class="impact-tile">
      <h4>${t.title}</h4>
      <ul>${t.items.map(i => `<li>${escape(i)}</li>`).join("")}</ul>
    </div>
  `).join("");
}

function wireCalc() {
  document.getElementById("calcBtn").addEventListener("click", runCalc);
  document.getElementById("ctcInput").addEventListener("change", runCalc);
  document.getElementById("metroSel").addEventListener("change", runCalc);
}

function runCalc() {
  const ctc = Number(document.getElementById("ctcInput").value) || 0;
  const metro = document.getElementById("metroSel").value === "true";
  const emp = { ctc, metro };
  const legacy = splitWages(emp, "legacy");
  const newCode = splitWages(emp, "new");

  // Monthly PF impact (12% both sides capped at ₹15k basic/mo → ₹1800 max each)
  const pfL = Math.round(Math.min(legacy.monthly.basic, 15000) * 0.12);
  const pfN = Math.round(Math.min(newCode.monthly.basic, 15000) * 0.12);

  const gratuityL = legacy.monthly.gratuity;
  const gratuityN = newCode.monthly.gratuity;

  // Take-home: monthly paid portion minus employee PF + TDS proxy (ignored for simplicity — highlighting wage-base delta)
  const paidL = legacy.monthly.basic + legacy.monthly.hra + legacy.monthly.special + legacy.monthly.lta + legacy.monthly.medical;
  const paidN = newCode.monthly.basic + newCode.monthly.hra + newCode.monthly.special + newCode.monthly.lta + newCode.monthly.medical;
  const takehomeL = paidL - pfL;
  const takehomeN = paidN - pfN;

  const el = document.getElementById("calcResult");
  el.innerHTML = `
    <div class="compare">
      <div class="compare-col">
        <h4>Legacy (pre-Code)</h4>
        <div class="row"><span>Monthly Basic</span><b>${fmt(legacy.monthly.basic)}</b></div>
        <div class="row"><span>HRA</span><b>${fmt(legacy.monthly.hra)}</b></div>
        <div class="row"><span>Special Allowance</span><b>${fmt(legacy.monthly.special)}</b></div>
        <div class="row"><span>Employer PF (m)</span><b>${fmt(pfL)}</b></div>
        <div class="row"><span>Employee PF (m)</span><b>${fmt(pfL)}</b></div>
        <div class="row"><span>Gratuity accrual (m)</span><b>${fmt(gratuityL)}</b></div>
        <div class="row"><span>Est. take-home (m)</span><b>${fmt(takehomeL)}</b></div>
      </div>

      <div class="compare-col">
        <h4>New Labour Codes</h4>
        <div class="row"><span>Monthly Basic</span><b>${fmt(newCode.monthly.basic)}</b></div>
        <div class="row"><span>HRA</span><b>${fmt(newCode.monthly.hra)}</b></div>
        <div class="row"><span>Special Allowance</span><b>${fmt(newCode.monthly.special)}</b></div>
        <div class="row"><span>Employer PF (m)</span><b>${fmt(pfN)}</b></div>
        <div class="row"><span>Employee PF (m)</span><b>${fmt(pfN)}</b></div>
        <div class="row"><span>Gratuity accrual (m)</span><b>${fmt(gratuityN)}</b></div>
        <div class="row"><span>Est. take-home (m)</span><b>${fmt(takehomeN)}</b></div>
      </div>

      <div class="compare-col delta">
        <h4>Δ New minus Legacy</h4>
        <div class="row"><span>Basic</span>${delta(newCode.monthly.basic - legacy.monthly.basic)}</div>
        <div class="row"><span>Special</span>${delta(newCode.monthly.special - legacy.monthly.special)}</div>
        <div class="row"><span>PF (each side)</span>${delta(pfN - pfL)}</div>
        <div class="row"><span>Gratuity accrual</span>${delta(gratuityN - gratuityL)}</div>
        <div class="row"><span>Take-home</span>${delta(takehomeN - takehomeL)}</div>
        <div class="row"><span>Annual retirement corpus ↑</span><b>${fmt((pfN - pfL) * 12 * 2 + (gratuityN - gratuityL) * 12)}</b></div>
      </div>
    </div>
    <p class="muted" style="margin-top:10px;font-size:12.5px">
      Deltas reflect ONLY the wage-base shift from Code on Wages §2(y). They don't include TDS changes (income tax slabs are unchanged). PF here is shown capped at ₹15,000 basic (EPF Scheme Para 26A) — many Code-compliant employers will voluntarily uncap, further raising PF contributions.
    </p>
  `;
}

function delta(n) {
  if (n > 0) return `<b class="up">+${fmt(n)}</b>`;
  if (n < 0) return `<b class="down">${fmt(n)}</b>`;
  return `<b>${fmt(0)}</b>`;
}

function escape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

boot().catch(e => {
  console.error(e);
  document.getElementById("codeDetail").innerHTML = `<p class="muted">Failed to load: ${e.message}</p>`;
});
