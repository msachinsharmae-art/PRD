// Perquisites comparison page — India FY 25-26 vs FY 26-27 (IT Rules 2026).

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmt = (n) => typeof n === "number" ? INR.format(n) : n;

let data;
let filter = "all";

boot().catch(e => {
  document.getElementById("list").innerHTML = `<p class="muted">Failed to load: ${e.message}</p>`;
});

async function boot() {
  const res = await fetch("/data/compliance/in-perquisites-2026-27.json");
  data = await res.json();
  document.getElementById("statusLine").textContent = data.meta.legal_basis;

  // Expose page context to AI drawer
  window.__GT_PAGE_CTX__ = () => ({
    page: "perquisites",
    country: "IN",
    active_filter: filter,
    legal_basis: data.meta.legal_basis,
    changes: data.perquisites.map(p => ({
      id: p.id,
      title: p.title,
      old: p.old_rule,
      new: p.new_rule,
      impact: p.impact,
      regime: p.regime
    }))
  });

  renderSummary();
  renderList();
  wireFilters();
  wireCalc();
}

function renderSummary() {
  const cards = [
    { n: data.perquisites.length, l: "Perquisite heads covered" },
    { n: data.perquisites.filter(p => p.regime === "both").length, l: "Apply in BOTH regimes" },
    { n: "1 Apr 2026", l: "Effective from" },
    { n: "IT Act 2025", l: "Legal basis" }
  ];
  document.getElementById("summaryBar").innerHTML = cards.map(c => `
    <div class="summary-card">
      <div class="n">${c.n}</div>
      <div class="l">${c.l}</div>
    </div>
  `).join("");
}

function renderList() {
  const visible = filter === "all" ? data.perquisites : data.perquisites.filter(p => p.regime === filter);
  document.getElementById("list").innerHTML = visible.map(renderPerq).join("");
}

function renderPerq(p) {
  const regimeLabel = p.regime === "old_only" ? "OLD regime only" : "BOTH regimes";
  return `
    <div class="card perq-card">
      <div class="perq-head">
        <h3>${p.title}</h3>
        <span class="regime-pill ${p.regime}">${regimeLabel}</span>
      </div>
      <div class="perq-split">
        <div class="perq-side">
          <h4>FY 2025-26 (till 31 Mar 2026)</h4>
          ${renderRules(p.old_rule)}
          ${p.driver_old_mo !== undefined ? `<div class="row"><span>Driver</span><b>${fmt(p.driver_old_mo)}/mo</b></div>` : ""}
          ${p.old_rule.ref ? `<div class="ref">${p.old_rule.ref}</div>` : ""}
        </div>
        <div class="perq-side new">
          <h4>FY 2026-27 (from 1 Apr 2026)</h4>
          ${renderRules(p.new_rule, true)}
          ${p.driver_new_mo !== undefined ? `<div class="row"><span>Driver</span><b class="val">${fmt(p.driver_new_mo)}/mo</b></div>` : ""}
          ${p.new_rule.ref ? `<div class="ref">${p.new_rule.ref}</div>` : ""}
        </div>
      </div>
      ${p.impact ? `<div class="perq-impact"><b>Impact:</b> ${p.impact}</div>` : ""}
      ${p.special_exempt ? `<div class="muted" style="margin-top:6px;font-size:12px">📌 <b>Always exempt:</b> ${p.special_exempt}</div>` : ""}
      ${p.startup_deferral ? `<div class="muted" style="margin-top:6px;font-size:12px">🚀 <b>Start-up deferral:</b> ${p.startup_deferral}</div>` : ""}
      ${p.formulas ? renderFormulas(p.formulas) : ""}
    </div>
  `;
}

function renderRules(r, isNew = false) {
  const cls = isNew ? "val" : "";
  let html = "";
  const skip = new Set(["ref", "note"]);
  for (const [k, v] of Object.entries(r)) {
    if (skip.has(k)) continue;
    if (Array.isArray(v)) {
      html += `<div class="row"><span>${humanKey(k)}</span><b class="${cls}">${v.join(", ")}</b></div>`;
    } else if (typeof v === "number") {
      html += `<div class="row"><span>${humanKey(k)}</span><b class="${cls}">${fmt(v)}</b></div>`;
    } else {
      html += `<div class="row"><span>${humanKey(k)}</span><b class="${cls}">${v}</b></div>`;
    }
  }
  if (r.note) html += `<div class="ref">${r.note}</div>`;
  return html;
}

function renderFormulas(fs) {
  return `
    <div style="margin-top:10px;padding:10px 12px;background:var(--surface-2);border-radius:8px;font-size:12px;font-family:monospace">
      ${Object.entries(fs).map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`).join("")}
    </div>
  `;
}

function humanKey(k) {
  return k.replace(/_/g, " ").replace(/mo\b/g, "/mo").replace(/pct/g, "%").replace(/50pct/g, " 50%");
}

function wireFilters() {
  document.querySelectorAll("[data-filter]").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      filter = b.dataset.filter;
      renderList();
    });
  });
}

function wireCalc() {
  const sel = document.getElementById("calcPerq");
  const input = document.getElementById("calcInput");
  const btn = document.getElementById("calcBtn");

  const configure = () => {
    const id = sel.value;
    if (id === "gift_vouchers") { input.placeholder = "Aggregate gifts received (₹)"; input.value = 18000; }
    else if (id === "loan")     { input.placeholder = "Loan outstanding (₹)";          input.value = 500000; }
    else if (id === "meal")     { input.placeholder = "Cost per meal (₹)";             input.value = 250; }
    else if (id === "children_edu") { input.placeholder = "Cost per child/mo (₹)";      input.value = 4500; }
    else { input.placeholder = "Not needed"; input.value = ""; input.disabled = true; return; }
    input.disabled = false;
  };
  sel.addEventListener("change", configure);
  btn.addEventListener("click", compute);
  configure();
  compute();

  function compute() {
    const id = sel.value;
    const val = Number(input.value) || 0;
    const p = data.perquisites.find(x => x.id === id);
    if (!p) return;
    let old = 0, nw = 0, explain = "";
    switch (id) {
      case "motor_car_small":
        old = p.old_rule.employer_paid_fuel_mo;
        nw  = p.new_rule.employer_paid_fuel_mo;
        explain = `Fixed monthly perquisite for a ≤1.6L employer-provided car with employer-paid fuel. Driver (if any) adds ${fmt(p.driver_old_mo)} (old) / ${fmt(p.driver_new_mo)} (new) separately.`;
        break;
      case "motor_car_large":
        old = p.old_rule.employer_paid_fuel_mo;
        nw  = p.new_rule.employer_paid_fuel_mo;
        explain = `Fixed monthly perquisite for >1.6L car, employer-paid fuel.`;
        break;
      case "gift_vouchers":
        old = val > p.old_rule.threshold ? val : 0;
        nw  = val > p.new_rule.threshold ? val : 0;
        explain = `Cliff rule: if aggregate gifts exceed the threshold, the ENTIRE amount becomes taxable. Old threshold ₹${p.old_rule.threshold.toLocaleString("en-IN")} → New ₹${p.new_rule.threshold.toLocaleString("en-IN")}.`;
        break;
      case "loan":
        // assume 5% differential
        old = val > p.old_rule.threshold ? Math.round(val * 0.05 / 12) : 0;
        nw  = val > p.new_rule.threshold ? Math.round(val * 0.05 / 12) : 0;
        explain = `Perquisite = (SBI MCLR − Employee Rate) × Outstanding ÷ 12. Assumed 5% differential. Below the threshold, zero perquisite. Old: ₹20k threshold → New: ₹2L threshold.`;
        break;
      case "meal":
        old = val > p.old_rule.exempt_per_meal ? (val - p.old_rule.exempt_per_meal) : 0;
        nw  = val > p.new_rule.exempt_per_meal ? (val - p.new_rule.exempt_per_meal) : 0;
        explain = `Excess rule: only the amount over the per-meal exempt limit is taxable. Plus, meal allowance is now available in BOTH old and new tax regimes.`;
        break;
      case "children_edu":
        old = Math.max(0, val - p.old_rule.exempt_per_child_mo);
        nw  = Math.max(0, val - p.new_rule.exempt_per_child_mo);
        explain = `Excess rule per child/month: only cost over the exempt limit is taxable (old regime only — new regime does not allow).`;
        break;
    }
    const delta = nw - old;
    const better = delta < 0;   // lower perquisite = less taxable = better for employee
    document.getElementById("calcResult").innerHTML = `
      <div class="perq-split" style="margin-top:14px">
        <div class="perq-side">
          <h4>FY 2025-26</h4>
          <div class="row"><span>Taxable perquisite</span><b>${fmt(old)}</b></div>
        </div>
        <div class="perq-side new">
          <h4>FY 2026-27</h4>
          <div class="row"><span>Taxable perquisite</span><b class="val">${fmt(nw)}</b></div>
        </div>
      </div>
      <div class="perq-impact" style="margin-top:14px">
        <b>Δ from FY26-27:</b>
        ${delta === 0
          ? "No change."
          : `${delta > 0 ? "↑" : "↓"} ${fmt(Math.abs(delta))} ${better ? "(lower tax for employee — better)" : "(higher tax for employee)"}`}
        — ${explain}
      </div>
    `;
  }
}
