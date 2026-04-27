// Statutory Rule Library — read/edit all PF/ESI/PT/LWF/Bonus/MinWage + country-level rules.
// Values render from statutory-rules.json; user edits persist to localStorage.

const fmtNum = (n, cur = "₹") => cur + (n ?? 0).toLocaleString("en-IN");
const LS_KEY = "gt_statutory_overrides";

let data;
let overrides = loadOverrides();
let activePath = "IN.pf";

const GROUPS = [
  { title: "India", entries: [
    ["IN.pf",        "Provident Fund"],
    ["IN.esi",       "Employees' State Insurance"],
    ["IN.pt",        "Professional Tax (state)"],
    ["IN.lwf",       "Labour Welfare Fund"],
    ["IN.bonus",     "Bonus"],
    ["IN.min_wages", "Minimum Wages"],
    ["IN.tds_slabs", "Income Tax Slabs"]
  ]},
  { title: "United States", entries: [
    ["US.fica",       "FICA (SS + Medicare)"],
    ["US.futa_suta",  "FUTA + SUTA"],
    ["US.federal_wh", "Federal Withholding"]
  ]},
  { title: "UAE", entries: [
    ["AE.gpssa", "GPSSA Pension"],
    ["AE.eos",   "End-of-Service"],
    ["AE.wps",   "WPS"]
  ]},
  { title: "Saudi Arabia", entries: [
    ["SA.gosi", "GOSI"],
    ["SA.eos",  "End-of-Service"]
  ]},
  { title: "Egypt", entries: [
    ["EG.si",         "Social Insurance"],
    ["EG.income_tax", "Personal Income Tax"]
  ]}
];

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveOverrides() { localStorage.setItem(LS_KEY, JSON.stringify(overrides)); }

async function boot() {
  data = await fetch("/data/statutory-rules.json").then(r => r.json());

  // Jump to the topbar-selected country's first rule on boot
  const topbarCountry = localStorage.getItem("gt_country");
  if (topbarCountry && data[topbarCountry]) {
    const firstKey = Object.keys(data[topbarCountry])[0];
    if (firstKey) activePath = `${topbarCountry}.${firstKey}`;
  }

  // React to topbar country changes
  window.addEventListener("gt:country", (e) => {
    const code = e.detail;
    if (data[code]) {
      const firstKey = Object.keys(data[code])[0];
      if (firstKey) { activePath = `${code}.${firstKey}`; renderPicker(); renderActive(); }
    }
  });

  // Expose page context to AI drawer
  window.__GT_PAGE_CTX__ = () => {
    const [country, key] = activePath.split(".");
    const rule = data[country]?.[key];
    return {
      page: "configure",
      active_country: country,
      active_rule: key,
      rule_title: rule?.title,
      authority: rule?.authority,
      applicability: rule?.applicability,
      rates: rule?.rates,
      ceilings: rule?.ceilings
    };
  };

  renderPicker();
  renderActive();
}

function renderPicker() {
  const el = document.getElementById("cfgPicker");
  // Find the active rule's title for the collapsed-header label
  let activeLabel = "Choose a rule";
  for (const g of GROUPS) {
    const hit = g.entries.find(([k]) => k === activePath);
    if (hit) { activeLabel = `${g.title} · ${hit[1]}`; break; }
  }
  el.innerHTML = `
    <div class="picker-toggle" data-picker-toggle>
      <span class="label">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="1.75" fill="none"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33"/></svg>
        ${activeLabel}
      </span>
      <svg class="chev" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="picker-list">
      ${GROUPS.map(g => `
        <div class="cfg-group">${g.title}</div>
        ${g.entries.map(([k, t]) => `<div class="cfg-picker-item ${k === activePath ? "active" : ""}" data-k="${k}">${t}</div>`).join("")}
      `).join("")}
    </div>
  `;
  el.classList.toggle("open", window.innerWidth > 900);
  el.querySelector("[data-picker-toggle]").addEventListener("click", () => el.classList.toggle("open"));

  el.querySelectorAll("[data-k]").forEach(n => n.addEventListener("click", () => {
    activePath = n.dataset.k;
    renderPicker();
    renderActive();
    if (window.innerWidth <= 900) {
      el.classList.remove("open");
      const panel = document.getElementById("cfgPanel");
      if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }));
}

function getRule() {
  const [country, key] = activePath.split(".");
  const base = data[country][key];
  return base;
}

function currencyOf(country) {
  return { IN: "₹", US: "$", AE: "AED ", SA: "SAR ", EG: "EGP " }[country] || "";
}

function renderActive() {
  const rule = getRule();
  const [country, key] = activePath.split(".");
  const cur = currencyOf(country);
  const panel = document.getElementById("cfgPanel");

  let html = `
    <div class="cfg-block">
      <h3>${rule.title}</h3>
      <div class="authority">${rule.authority || ""}</div>
      <div class="act-badges">
        ${rule.act     ? `<span class="badge ok">${rule.act}</span>`       : ""}
        ${rule.act_old ? `<span class="badge">Old: ${rule.act_old}</span>` : ""}
        ${rule.act_new ? `<span class="badge new">New: ${rule.act_new}</span>` : ""}
        ${rule.form    ? `<span class="badge">Form: ${rule.form}</span>`   : ""}
      </div>
      ${rule.applicability ? `<p><b>Applicability:</b> ${rule.applicability}</p>` : ""}
      ${rule.formula       ? `<p><b>Formula:</b> ${rule.formula}</p>` : ""}
      ${rule.stepup        ? `<p style="background:#FEF3C7;padding:8px 12px;border-radius:6px;font-size:13px"><b>⚠ Note:</b> ${rule.stepup}</p>` : ""}
    </div>
  `;

  if (rule.rates) html += rateBlock("Rates", rule.rates, country);
  if (rule.rates_saudi_emp) html += rateBlock("Saudi employee", rule.rates_saudi_emp, country);
  if (rule.rates_saudi_er)  html += rateBlock("Saudi employer", rule.rates_saudi_er, country);
  if (rule.rates_expat)     html += rateBlock("Expats", rule.rates_expat, country);
  if (rule.ceilings)        html += ceilingBlock(rule.ceilings, cur, country, key);
  if (rule.deadlines)       html += deadlineBlock(rule.deadlines);
  if (rule.penalties)       html += `<div class="cfg-block"><h3>Penalties</h3><p>${rule.penalties}</p></div>`;
  if (rule.martyrs_fund)    html += `<div class="cfg-block"><h3>Martyrs & Victims Fund</h3><p>Rate: <b>${rule.martyrs_fund.rate}</b> of gross · ${rule.martyrs_fund.act}</p></div>`;
  if (rule.timing)          html += `<div class="cfg-block"><h3>Timing</h3><p>${rule.timing}</p></div>`;

  if (rule.state_slabs) html += stateMatrixBlock("Professional Tax — State Slabs", rule.state_slabs,
    [{ k: "state", l: "State" }, { k: "frequency", l: "Frequency" }, { k: "slabs", l: "Slab structure" }]);
  if (rule.state_amounts) html += stateMatrixBlock("LWF — State Amounts", rule.state_amounts,
    [{ k: "state", l: "State" }, { k: "frequency", l: "Frequency" },
     { k: "employee", l: "Employee (₹)", money: true }, { k: "employer", l: "Employer (₹)", money: true }]);

  if (rule.central_sphere_latest) {
    html += `
      <div class="cfg-block">
        <h3>Central Sphere — ${rule.central_sphere_latest.effective}</h3>
        <table class="slab-table">
          <thead><tr><th>Skill category</th><th>Monthly</th><th>Daily</th></tr></thead>
          <tbody>${rule.central_sphere_latest.rates_monthly.map(r => `<tr><td>${r.category}</td><td class="num">₹${r.monthly.toLocaleString("en-IN")}</td><td class="num">₹${r.daily}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    `;
  }
  if (rule.state_samples) {
    html += `
      <div class="cfg-block">
        <h3>State samples</h3>
        <table class="slab-table">
          <thead><tr><th>State</th><th>Unskilled/mo</th><th>Notes</th></tr></thead>
          <tbody>${rule.state_samples.map(s => `<tr><td>${s.state}</td><td class="num">₹${s.unskilled_monthly.toLocaleString("en-IN")}</td><td class="muted">${s.note || ""}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    `;
  }
  if (rule.new_regime) html += slabsBlock("New Regime FY 25-26", rule.new_regime, cur);
  if (rule.old_regime) html += slabsBlock("Old Regime FY 25-26", rule.old_regime, cur);
  if (rule.brackets_annual) html += slabsBlock("Annual brackets", rule.brackets_annual, cur);
  if (rule.std_deduction) html += `<div class="cfg-block"><h3>Standard deduction</h3><p>New regime: <b>${cur}${rule.std_deduction.new.toLocaleString("en-IN")}</b> · Old regime: <b>${cur}${rule.std_deduction.old.toLocaleString("en-IN")}</b></p></div>`;
  if (rule["87a_limit"]) html += `<div class="cfg-block"><h3>§87A Rebate</h3><p>New: income ≤ <b>${cur}${rule["87a_limit"].new.toLocaleString("en-IN")}</b> → zero tax · Old: ≤ <b>${cur}${rule["87a_limit"].old.toLocaleString("en-IN")}</b></p><p class="muted">${rule["87a_limit"].note || ""}</p></div>`;
  if (rule.personal_exemption) html += `<div class="cfg-block"><h3>Personal Exemption</h3><p>Amount: <b>${cur}${rule.personal_exemption.amount.toLocaleString("en-IN")}</b> / ${rule.personal_exemption.per}</p></div>`;
  if (rule.requirement) html += `<div class="cfg-block"><h3>Requirement</h3><p>${rule.requirement}</p></div>`;

  html += `<p class="save-hint">Edits stored locally in your browser. Clear via <code>localStorage.removeItem("${LS_KEY}")</code>.</p>`;

  panel.innerHTML = html;
  wireEdits(country, key);
}

function rateBlock(label, rates, country) {
  return `
    <div class="cfg-block">
      <h3>${label}</h3>
      <div class="rule-grid">
        <div class="h head">Head</div><div class="h">Rate</div><div class="h">Note / Base</div>
        ${rates.map((r, i) => `
          <div class="head">${r.head}</div>
          <div class="val"><span class="editable" data-edit="rate:${i}" contenteditable="true">${r.rate}</span></div>
          <div class="note">${r.note || r.base || ""}</div>
        `).join("")}
      </div>
    </div>
  `;
}

function ceilingBlock(ceilings, cur, country, key) {
  return `
    <div class="cfg-block">
      <h3>Ceilings</h3>
      <div class="rule-grid">
        <div class="h head">Parameter</div><div class="h">Value</div><div class="h">Reference</div>
        ${ceilings.map((c, i) => `
          <div class="head">${c.label}</div>
          <div class="val"><span class="editable" data-edit="ceil:${i}" contenteditable="true">${(c.currency || cur) + c.value.toLocaleString("en-IN")}</span> <span class="muted">/ ${c.per || "—"}</span></div>
          <div class="note">${c.ref || c.note || ""}</div>
        `).join("")}
      </div>
    </div>
  `;
}

function deadlineBlock(deadlines) {
  return `
    <div class="cfg-block">
      <h3>Filing deadlines</h3>
      <table class="slab-table">
        <thead><tr><th>Task</th><th>Due date</th></tr></thead>
        <tbody>${deadlines.map(d => `<tr><td>${d.task}</td><td><b>${d.date}</b></td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function stateMatrixBlock(label, rows, cols) {
  return `
    <div class="cfg-block">
      <h3>${label}</h3>
      <div class="state-mat">
        <table>
          <thead><tr>${cols.map(c => `<th>${c.l}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.money ? "num" : ""}">${c.money ? (typeof r[c.k] === "number" ? "₹" + r[c.k].toLocaleString("en-IN") : r[c.k]) : r[c.k]}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}

function slabsBlock(label, slabs, cur) {
  return `
    <div class="cfg-block">
      <h3>${label}</h3>
      <table class="slab-table">
        <thead><tr><th>From</th><th>To</th><th>Rate</th></tr></thead>
        <tbody>${slabs.map(s => `<tr><td class="num">${cur}${s.from.toLocaleString("en-IN")}</td><td class="num">${s.to ? cur + s.to.toLocaleString("en-IN") : "∞"}</td><td><b>${s.rate}</b></td></tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function wireEdits(country, key) {
  document.querySelectorAll("[data-edit]").forEach(el => {
    el.addEventListener("blur", () => {
      const text = el.textContent.trim();
      overrides[`${country}.${key}.${el.dataset.edit}`] = text;
      saveOverrides();
      el.style.background = "#DCFCE7";
      setTimeout(() => el.style.background = "", 800);
    });
  });
}

boot().catch(e => {
  document.getElementById("cfgPanel").innerHTML = `<p class="muted">Failed to load: ${e.message}</p>`;
});
