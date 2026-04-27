// Multi-country payroll & compliance dashboard controller.
// Responsibilities:
//   · pick country → dynamic-import the right payroll engine + dataset
//   · compute monthly results via that engine (deterministic; no LLM)
//   · render KPIs, charts, calendar, employee table
//   · handle wage-code toggle (India only), role switch, and AI query
//   · read employees/runs from localStorage if the user uploaded a CSV

const COUNTRIES = {
  IN: {
    label: "India", currency: "INR", currencySymbol: "₹", locale: "en-IN",
    enginePath: "/js/rule-engine/india-payroll/index.js",
    employeesPath: "/data/payroll/employees.json",
    runsPath: "/data/payroll/runs-raw.json",
    calendarPath: "/data/compliance/in-calendar-2026.json",
    hasWageCodeToggle: true,
    companyLabel: "Acme Technologies Pvt Ltd",
    fyLabel: "FY 2025-26",
    statutoryKPIs: ["pf", "gratuity", "pt", "tds"]
  },
  US: {
    label: "United States", currency: "USD", currencySymbol: "$", locale: "en-US",
    enginePath: "/js/rule-engine/us-payroll/index.js",
    employeesPath: "/data/payroll/employees-us.json",
    runsPath: "/data/payroll/runs-raw-us.json",
    calendarPath: "/data/compliance/us-calendar-2026.json",
    hasWageCodeToggle: false,
    companyLabel: "Acme Technologies Inc",
    fyLabel: "TY 2025",
    statutoryKPIs: ["pf", "gratuity", "pt", "tds"]
  },
  AE: {
    label: "United Arab Emirates", currency: "AED", currencySymbol: "AED ", locale: "en-AE",
    enginePath: "/js/rule-engine/uae-payroll/index.js",
    employeesPath: "/data/payroll/employees-uae.json",
    runsPath: "/data/payroll/runs-raw-uae.json",
    calendarPath: "/data/compliance/uae-calendar-2026.json",
    hasWageCodeToggle: false,
    companyLabel: "Acme Technologies FZ-LLC",
    fyLabel: "FY 2026",
    statutoryKPIs: ["pf", "gratuity", "pt", "tds"]
  },
  SA: {
    label: "Saudi Arabia", currency: "SAR", currencySymbol: "SAR ", locale: "en-SA",
    enginePath: "/js/rule-engine/ksa-payroll/index.js",
    employeesPath: "/data/payroll/employees-ksa.json",
    runsPath: "/data/payroll/runs-raw-ksa.json",
    calendarPath: "/data/compliance/ksa-calendar-2026.json",
    hasWageCodeToggle: false,
    companyLabel: "Acme Technologies KSA LLC",
    fyLabel: "FY 2026",
    statutoryKPIs: ["pf", "gratuity", "pt", "tds"]
  },
  EG: {
    label: "Egypt", currency: "EGP", currencySymbol: "EGP ", locale: "en-EG",
    enginePath: "/js/rule-engine/egypt-payroll/index.js",
    employeesPath: "/data/payroll/employees-eg.json",
    runsPath: "/data/payroll/runs-raw-eg.json",
    calendarPath: "/data/compliance/eg-calendar-2026.json",
    hasWageCodeToggle: false,
    companyLabel: "Acme Technologies Egypt LLC",
    fyLabel: "FY 2026",
    statutoryKPIs: ["pf", "pt", "tds"]
  }
};

const state = {
  country: localStorage.getItem("gt_country") || "IN",
  wageCode: "legacy",
  engine: null,
  employees: [],
  runs: {},
  months: [],
  calendar: [],
  charts: {},
  source: "seed"
};

function fmtNum(n, country = state.country) {
  const cfg = COUNTRIES[country];
  return new Intl.NumberFormat(cfg.locale, { style: "currency", currency: cfg.currency, maximumFractionDigits: 0 }).format(n || 0);
}
function compact(n, country = state.country) {
  const cfg = COUNTRIES[country];
  const sym = cfg.currencySymbol;
  if (country === "IN") {
    if (Math.abs(n) >= 1e7) return sym + (n / 1e7).toFixed(2) + " Cr";
    if (Math.abs(n) >= 1e5) return sym + (n / 1e5).toFixed(2) + " L";
  } else {
    if (Math.abs(n) >= 1e6) return sym + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return sym + (n / 1e3).toFixed(1) + "k";
  }
  return fmtNum(n, country);
}

async function boot() {
  wireCountryChips();
  wireWageToggle();
  wireAI();
  // Dashboard context for cross-platform AI (shell.js reads this)
  window.__GT_DASHBOARD_CTX__ = () => ({
    country: state.country,
    months: state.months,
    latest: aggregateAllMonths(state.wageCode).slice(-1)[0],
    trend: aggregateAllMonths(state.wageCode)
  });
  await loadCountry(state.country);
}

async function loadCountry(code) {
  state.country = code;
  localStorage.setItem("gt_country", code);
  document.querySelectorAll("[data-country]").forEach(b => b.classList.toggle("active", b.dataset.country === code));

  const cfg = COUNTRIES[code];
  document.getElementById("companyLabel").textContent = cfg.companyLabel;
  document.getElementById("countryLabel").textContent = cfg.label;
  document.getElementById("fyLabel").textContent = cfg.fyLabel;

  // Show/hide wage-code toggle (India-only)
  const wageBar = document.getElementById("wageSeg");
  const wageLabel = document.getElementById("wageCodeLabel");
  if (cfg.hasWageCodeToggle) { wageBar.classList.remove("hidden"); wageLabel.classList.remove("hidden"); }
  else { wageBar.classList.add("hidden"); wageLabel.classList.add("hidden"); }

  state.engine = await import(cfg.enginePath);

  // Load data: localStorage override first, then seed JSON
  const over = readLocalOverride(code);
  if (over) {
    state.employees = over.employees;
    state.runs = over.runs;
    state.months = over.months;
    state.source = "uploaded";
  } else {
    const [e, r] = await Promise.all([
      fetch(cfg.employeesPath).then(r => r.json()),
      fetch(cfg.runsPath).then(r => r.json())
    ]);
    state.employees = e.employees;
    state.runs = r.runs;
    state.months = r.meta.months;
    state.source = "seed";
  }

  const cal = await fetch(cfg.calendarPath).then(r => r.json());
  state.calendar = cal.events;

  document.getElementById("dataSourceLabel").textContent = state.source;
  renderAll();
}

function wireCountryChips() {
  // Country chips live in the topbar now (shell.js).
  // Kept as no-op for backward compatibility.
  document.querySelectorAll("[data-country]").forEach(b => {
    b.addEventListener("click", () => loadCountry(b.dataset.country));
  });
}
function wireWageToggle() {
  document.querySelectorAll(".seg-btn").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      state.wageCode = b.dataset.wage;
      renderAll();
    });
  });
}
function readLocalOverride(country) {
  try {
    const raw = localStorage.getItem("gt_upload_" + country);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// ─── Render ─────────────────────────────────────────────────────────

function aggregateAllMonths(wageCode) {
  return state.months.map(month => {
    const rows = state.runs[month] || [];
    const { totals } = state.engine.runMonth(state.employees, rows, { wageCode });
    return { month, ...totals };
  });
}

function renderAll() {
  const wc = state.wageCode;
  const trend = aggregateAllMonths(wc);
  const latest = trend[trend.length - 1];

  if (COUNTRIES[state.country].hasWageCodeToggle) {
    const other = aggregateAllMonths(wc === "legacy" ? "new" : "legacy");
    renderImpactBanner(latest, other[other.length - 1], wc);
  } else {
    renderCountryBanner();
  }
  renderKPIs(latest);
  renderTrendChart(trend);
  renderBreakdownChart(trend);
  renderCalendar();
  renderDeptChart();
  renderEmployeeTable();
  renderFootnote();
}

function renderCountryBanner() {
  const el = document.getElementById("impactBanner");
  const tag = {
    US: "Federal income-tax withholding (IRS Pub 15-T) · FICA SS 6.2% + Medicare 1.45% · FUTA 0.6% + state SUTA · simplified state income tax.",
    AE: "0% personal income tax. GPSSA (pension) applies only to UAE/GCC nationals: 11% employee + 12.5% employer. Expats accrue End-of-Service Gratuity (Art. 51) — 21 days basic first 5 years, 30 days thereafter.",
    SA: "0% personal income tax. GOSI (July 2025): Saudi nationals 10.25% employee + 12.25% employer (9.5% annuities + 0.75% SANED + 2% OH). Expats: employer-only 2% OH. EOS gratuity Art 84: 0.5/1.0 month basic per year.",
    EG: "Social Insurance (Law 148/2019): 11% employee + 18.75% employer, capped at EGP 16,700/mo (2026). Martyrs & Victims Fund 0.05%. Progressive income tax 0-27.5% with EGP 20,000 personal exemption.",
  }[state.country] || "";
  el.innerHTML = `<b>${COUNTRIES[state.country].label}</b> — ${tag}`;
}

function renderImpactBanner(cur, other, wc) {
  const el = document.getElementById("impactBanner");
  const legacyVals = wc === "legacy" ? cur : other;
  const newVals    = wc === "new"    ? cur : other;
  const pct = (a, b) => b ? ((a - b) / b) * 100 : 0;
  const dCorpus = pct(newVals.employerPF + newVals.employeePF + newVals.gratuityAccrual, legacyVals.employerPF + legacyVals.employeePF + legacyVals.gratuityAccrual);
  const dGrat   = pct(newVals.gratuityAccrual, legacyVals.gratuityAccrual);
  const dNet    = pct(newVals.netPay, legacyVals.netPay);
  const up   = (d) => `<span class="delta-up">↑ ${d.toFixed(1)}%</span>`;
  const down = (d) => `<span class="delta-down">↓ ${Math.abs(d).toFixed(1)}%</span>`;
  const arr = (d) => d >= 0 ? up(d) : down(d);
  const lab = wc === "legacy"
    ? `<b>Legacy Acts view</b> — pre-Code market practice (Basic 40% of CTC).`
    : `<b>New Labour Codes view</b> — Code on Wages §2(y) (Basic ≥ 50% of CTC).`;
  el.innerHTML = `${lab}<br>Legacy → New Code: retirement corpus (PF + gratuity) ${arr(dCorpus)} · gratuity provision ${arr(dGrat)} · employee take-home ${arr(dNet)}. CTC unchanged.`;
}

function renderKPIs(t) {
  const grid = document.getElementById("kpiGrid");
  const country = state.country;
  const cardsByCountry = {
    IN: [
      { label: "Headcount",        value: t.headcount,                       sub: "active" },
      { label: "Gross earnings",   value: compact(t.gross),                  sub: "monthly", cls: "accent" },
      { label: "Employer cost",    value: compact(t.employerCost),           sub: "incl. PF + gratuity" },
      { label: "Net pay",          value: compact(t.netPay),                 sub: "take-home", cls: "accent" },
      { label: "PF outflow",       value: compact(t.employerPF + t.employeePF), sub: `Er ${compact(t.employerPF)} · Ee ${compact(t.employeePF)}` },
      { label: "Gratuity accrual", value: compact(t.gratuityAccrual),         sub: "4.81% × basic", cls: "accent" },
      { label: "Professional Tax", value: compact(t.pt),                      sub: "eligible states" },
      { label: "TDS on salary",    value: compact(t.tds),                     sub: "§192 IT Act", cls: "danger" }
    ],
    US: [
      { label: "Headcount",        value: t.headcount,                       sub: "W-2 employees" },
      { label: "Gross earnings",   value: compact(t.gross),                  sub: "monthly", cls: "accent" },
      { label: "Employer cost",    value: compact(t.employerCost),           sub: "incl. FICA + FUTA + SUTA" },
      { label: "Net pay",          value: compact(t.netPay),                 sub: "take-home", cls: "accent" },
      { label: "FICA (total)",     value: compact(t.employerPF + t.employeePF), sub: "SS 6.2% + Medicare 1.45%" },
      { label: "Federal + State WH", value: compact(t.tds),                   sub: "IRS Pub 15-T method", cls: "danger" },
      { label: "FUTA + SUTA",      value: compact(Math.max(0, t.employerPF - (t.employerPF * 0.70))),  sub: "employer unemployment" },
      { label: "YTD bonus paid",   value: compact(0),                         sub: "sum of month bonuses" }
    ],
    AE: [
      { label: "Headcount",        value: t.headcount,                       sub: "employees" },
      { label: "Gross earnings",   value: compact(t.gross),                  sub: "monthly", cls: "accent" },
      { label: "Employer cost",    value: compact(t.employerCost),           sub: "incl. GPSSA + EOS" },
      { label: "Net pay",          value: compact(t.netPay),                 sub: "take-home", cls: "accent" },
      { label: "GPSSA (total)",    value: compact(t.employerPF + t.employeePF), sub: "UAE/GCC nationals only" },
      { label: "EOS gratuity accrual", value: compact(t.gratuityAccrual),    sub: "Art 51 Labour Law", cls: "accent" },
      { label: "Income tax",       value: "0",                                sub: "UAE has no PIT" },
      { label: "WPS status",       value: "OK",                               sub: "monthly salary transfers" }
    ],
    SA: [
      { label: "Headcount",        value: t.headcount,                       sub: "employees" },
      { label: "Gross earnings",   value: compact(t.gross),                  sub: "monthly", cls: "accent" },
      { label: "Employer cost",    value: compact(t.employerCost),           sub: "incl. GOSI + EOS" },
      { label: "Net pay",          value: compact(t.netPay),                 sub: "take-home", cls: "accent" },
      { label: "GOSI (total)",     value: compact(t.employerPF + t.employeePF), sub: "Saudis 10.25/12.25% (July 2025) · Expats 2%" },
      { label: "EOS gratuity accrual", value: compact(t.gratuityAccrual),    sub: "Art 84 Labour Law", cls: "accent" },
      { label: "Income tax",       value: "0",                                sub: "No PIT on individuals" },
      { label: "WPS status",       value: "OK",                               sub: "MHRSD compliant" }
    ],
    EG: [
      { label: "Headcount",        value: t.headcount,                       sub: "employees" },
      { label: "Gross earnings",   value: compact(t.gross),                  sub: "monthly", cls: "accent" },
      { label: "Employer cost",    value: compact(t.employerCost),           sub: "incl. SI 18.75%" },
      { label: "Net pay",          value: compact(t.netPay),                 sub: "take-home", cls: "accent" },
      { label: "Social Insurance", value: compact(t.employerPF + t.employeePF), sub: "11% + 18.75%, cap EGP 16,700" },
      { label: "Income tax",       value: compact(t.tds),                    sub: "0-27.5% progressive", cls: "danger" },
      { label: "Martyrs Fund",     value: compact(t.pt),                     sub: "0.05% of gross" },
      { label: "Personal exempt",  value: "EGP 20k",                          sub: "annual deduction" }
    ]
  };
  const cards = cardsByCountry[country] || cardsByCountry.IN;
  grid.innerHTML = cards.map(c => `
    <div class="kpi-card ${c.cls || ""}">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      <div class="kpi-sub">${c.sub}</div>
    </div>
  `).join("");
}

function renderTrendChart(trend) {
  const ctx = document.getElementById("trendChart");
  state.charts.trend?.destroy();
  state.charts.trend = new Chart(ctx, {
    type: "line",
    data: {
      labels: trend.map(m => fmtMonth(m.month)),
      datasets: [
        { label: "Gross",     data: trend.map(m => m.gross),  borderColor: "#7c5cff", backgroundColor: "rgba(124,92,255,.10)", tension: .35, fill: true },
        { label: "Net pay",   data: trend.map(m => m.netPay), borderColor: "#2ee6c1", backgroundColor: "rgba(46,230,193,.10)", tension: .35, fill: true },
        { label: "Statutory total", data: trend.map(m => m.employerPF + m.employeePF + m.pt + m.tds + m.gratuityAccrual), borderColor: "#ff6b6b", tension: .35, fill: false }
      ]
    },
    options: chartOpts()
  });
}

function renderBreakdownChart(trend) {
  const ctx = document.getElementById("breakdownChart");
  state.charts.breakdown?.destroy();
  // Country-specific dataset labels — only show segments that matter for that
  // jurisdiction so the chart legend reads as a clean compliance breakdown.
  const legendByCountry = {
    IN: { social: "PF (Er + Ee)",   gratuity: "Gratuity accrual",  third: "Professional Tax", income: "TDS on salary (§192)" },
    US: { social: "FICA (SS + Medicare)", gratuity: "—",          third: "FUTA / SUTA", income: "Federal + State withholding" },
    AE: { social: "GPSSA (Er + Ee)", gratuity: "EOS gratuity (Art 51)", third: "—",      income: "—" },
    SA: { social: "GOSI (Er + Ee)",  gratuity: "EOS gratuity (Art 84)", third: "—",      income: "—" },
    EG: { social: "Social Insurance (11% + 18.75%)", gratuity: "—", third: "Martyrs & Victims Fund 0.05%", income: "Personal Income Tax" }
  };
  const L = legendByCountry[state.country] || legendByCountry.IN;
  const datasets = [
    { label: L.social,   data: trend.map(m => m.employerPF + m.employeePF), backgroundColor: "#7c5cff" },
    { label: L.gratuity, data: trend.map(m => m.gratuityAccrual),            backgroundColor: "#2ee6c1" },
    { label: L.third,    data: trend.map(m => m.pt),                         backgroundColor: "#98a2c3" },
    { label: L.income,   data: trend.map(m => m.tds),                        backgroundColor: "#ff6b6b" }
  ].filter(d => d.label !== "—" && d.data.some(v => v > 0));
  state.charts.breakdown = new Chart(ctx, {
    type: "bar",
    data: { labels: trend.map(m => fmtMonth(m.month)), datasets },
    options: { ...chartOpts(), scales: { ...chartOpts().scales, x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: "rgba(255,255,255,.06)" }, ticks: { color: "#98a2c3", callback: v => compact(v) } } } }
  });
}

function renderDeptChart() {
  const latestMonth = state.months[state.months.length - 1];
  const runRows = state.runs[latestMonth] || [];
  const empMap = Object.fromEntries(state.employees.map(e => [e.id, e]));
  const byDept = {};
  for (const row of runRows) {
    const emp = empMap[row.id]; if (!emp) continue;
    const r = state.engine.computeMonthly(emp, row, { wageCode: state.wageCode, taxRegime: emp.regime });
    byDept[emp.dept] = (byDept[emp.dept] || 0) + r.employerCost;
  }
  const labels = Object.keys(byDept);
  const data = labels.map(l => byDept[l]);
  const ctx = document.getElementById("deptChart");
  state.charts.dept?.destroy();
  state.charts.dept = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: ["#7c5cff", "#2ee6c1", "#ff6b6b", "#ffb86b", "#98a2c3", "#5c7cff", "#ff5cb8", "#c5a2ff"] }] },
    options: { plugins: { legend: { position: "right", labels: { color: "#e7ecf7", font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => `${c.label}: ${compact(c.parsed)}` } } }, responsive: true, maintainAspectRatio: false }
  });
}

function renderCalendar() {
  const today = new Date();
  const upcoming = state.calendar
    .filter(e => { const d = new Date(e.date); const days = (d - today) / 86400000; return days >= -2 && days <= 90; })
    .slice(0, 10);
  const ul = document.getElementById("upcoming");
  ul.innerHTML = upcoming.map(e => {
    const d = new Date(e.date);
    return `
      <li>
        <div class="cal-date"><span class="d">${d.getDate()}</span>${d.toLocaleString("en-IN", { month: "short" })}</div>
        <div class="cal-body">
          <span class="cat ${e.category}">${e.category.toUpperCase()}</span>
          <div>${e.title}</div>
          ${e.act ? `<div class="muted" style="font-size:11.5px;margin-top:2px">${e.act}</div>` : ""}
        </div>
      </li>
    `;
  }).join("") || `<li class="muted">No deadlines in the next 90 days.</li>`;
}

function renderEmployeeTable() {
  const latestMonth = state.months[state.months.length - 1];
  document.getElementById("monthLabel").textContent = fmtMonth(latestMonth);
  document.getElementById("tableMonthLabel").textContent = fmtMonth(latestMonth);

  const runRows = state.runs[latestMonth] || [];
  const empMap = Object.fromEntries(state.employees.map(e => [e.id, e]));
  const rows = runRows.map(row => {
    const emp = empMap[row.id]; if (!emp) return null;
    return { emp, r: state.engine.computeMonthly(emp, row, { wageCode: state.wageCode, taxRegime: emp.regime }) };
  }).filter(Boolean);

  const headsByCountry = {
    IN: ["ID","Name","Dept","State","Gross","PF (Emp)","PT","TDS","Net Pay","Emp Cost"],
    US: ["ID","Name","Dept","State","Gross","FICA (Emp)","Fed WH","State Tax","Net Pay","Emp Cost"],
    AE: ["ID","Name","Dept","Emirate","Gross","GPSSA (Emp)","EOS accrual","","Net Pay","Emp Cost"],
    SA: ["ID","Name","Dept","City","Gross","GOSI (Emp)","EOS accrual","","Net Pay","Emp Cost"],
    EG: ["ID","Name","Dept","City","Gross","SI (Emp)","Income Tax","Martyrs","Net Pay","Emp Cost"]
  };
  const heads = headsByCountry[state.country] || headsByCountry.IN;
  document.getElementById("empTableHead").innerHTML =
    `<tr>${heads.map((h,i) => `<th class="${i>=4 ? 'num' : ''}">${h}</th>`).join("")}</tr>`;

  const rowRender = (wrap) => {
    const { emp, r } = wrap;
    const geo = emp.state || emp.emirate || emp.city || "";
    if (state.country === "IN") {
      return `<td>${emp.id}</td><td>${emp.name}<div class="muted">${emp.designation}</div></td><td>${emp.dept}</td><td>${geo}</td>
              <td class="num">${fmtNum(r.earnings.gross)}</td>
              <td class="num">${fmtNum(r.deductions.employeePF)}</td>
              <td class="num">${fmtNum(r.deductions.pt)}</td>
              <td class="num">${fmtNum(r.deductions.tds)}</td>
              <td class="num"><b>${fmtNum(r.netPay)}</b></td>
              <td class="num">${fmtNum(r.employerCost)}</td>`;
    }
    if (state.country === "US") {
      return `<td>${emp.id}</td><td>${emp.name}<div class="muted">${emp.designation}</div></td><td>${emp.dept}</td><td>${geo}</td>
              <td class="num">${fmtNum(r.earnings.gross)}</td>
              <td class="num">${fmtNum(r.deductions.empSS + r.deductions.empMed + r.deductions.addlMed)}</td>
              <td class="num">${fmtNum(r.deductions.fedWH)}</td>
              <td class="num">${fmtNum(r.deductions.stateTax)}</td>
              <td class="num"><b>${fmtNum(r.netPay)}</b></td>
              <td class="num">${fmtNum(r.employerCost)}</td>`;
    }
    if (state.country === "AE") {
      return `<td>${emp.id}</td><td>${emp.name}<div class="muted">${emp.designation}</div></td><td>${emp.dept}</td><td>${geo}</td>
              <td class="num">${fmtNum(r.earnings.gross)}</td>
              <td class="num">${fmtNum(r.deductions.employeeGPSSA)}</td>
              <td class="num">${fmtNum(r.deductions.eosAccrual)}</td>
              <td class="num">—</td>
              <td class="num"><b>${fmtNum(r.netPay)}</b></td>
              <td class="num">${fmtNum(r.employerCost)}</td>`;
    }
    if (state.country === "SA") {
      return `<td>${emp.id}</td><td>${emp.name}<div class="muted">${emp.designation}</div></td><td>${emp.dept}</td><td>${geo}</td>
              <td class="num">${fmtNum(r.earnings.gross)}</td>
              <td class="num">${fmtNum(r.deductions.employeeGOSI)}</td>
              <td class="num">${fmtNum(r.deductions.eosAccrual)}</td>
              <td class="num">—</td>
              <td class="num"><b>${fmtNum(r.netPay)}</b></td>
              <td class="num">${fmtNum(r.employerCost)}</td>`;
    }
    if (state.country === "EG") {
      return `<td>${emp.id}</td><td>${emp.name}<div class="muted">${emp.designation}</div></td><td>${emp.dept}</td><td>${geo}</td>
              <td class="num">${fmtNum(r.earnings.gross)}</td>
              <td class="num">${fmtNum(r.deductions.employeeSI)}</td>
              <td class="num">${fmtNum(r.deductions.incomeTax)}</td>
              <td class="num">${fmtNum(r.deductions.martyrs)}</td>
              <td class="num"><b>${fmtNum(r.netPay)}</b></td>
              <td class="num">${fmtNum(r.employerCost)}</td>`;
    }
  };
  document.querySelector("#empTable tbody").innerHTML = rows.map(w => `<tr>${rowRender(w)}</tr>`).join("");
  document.getElementById("tableMeta").textContent =
    `${rows.length} employees · ${COUNTRIES[state.country].label}${COUNTRIES[state.country].hasWageCodeToggle ? ' · ' + (state.wageCode === 'new' ? 'New Codes' : 'Legacy') : ''} · source: ${state.source}`;
}

function renderFootnote() {
  const notes = {
    IN: "India: FY 25-26 slabs (Budget 2025 Finance Act), EPF Scheme 1952, ESI Act 1948, state PT Acts; wage-code toggle applies Code on Wages 2019 §2(y). Perquisites update 1 Apr 2026 per IT Rules 2026 — see Perquisites page.",
    US: "US: 2025 brackets (IRS Rev. Proc. 2024-40), FICA SS wage base $176,100, FUTA 0.6% effective after state credit, simplified state income tax.",
    AE: "UAE: GPSSA Federal Law 7/1999 as amended 57/2023 (11%+12.5% for UAE/GCC nationals); End-of-Service gratuity Labour Law Decree 33/2021 Art 51; 0% PIT.",
    SA: "KSA (July 2025 update): GOSI annuities 9.5% + SANED 0.75% (employee & employer), occ-hazards 2% (employer); stepping up to 11% annuities by 2028. EOS Labour Law Art 84; 0% PIT.",
    EG: "Egypt: Social Insurance Law 148/2019 — 11%+18.75% on wage capped at EGP 16,700 (2026, +15%/yr). Martyrs & Victims Fund 0.05% of gross (Law 4/2021). Progressive IT 0-27.5%, personal exemption EGP 20,000."
  };
  document.getElementById("footnote").textContent = "Dummy dataset for illustration. " + (notes[state.country] || "");
}

function fmtMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "short", year: "2-digit" });
}
function chartOpts() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#e7ecf7", boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${compact(c.parsed.y)}` } } },
    scales: {
      x: { ticks: { color: "#98a2c3" }, grid: { color: "rgba(255,255,255,.04)" } },
      y: { ticks: { color: "#98a2c3", callback: v => compact(v) }, grid: { color: "rgba(255,255,255,.06)" } }
    }
  };
}

// ─── AI overlay ─────────────────────────────────────────────────────
function wireAI() {
  const input = document.getElementById("aiInput");
  const btn   = document.getElementById("aiSend");
  const reply = document.getElementById("aiReply");
  const send = async () => {
    const q = input.value.trim();
    if (!q) return;
    reply.classList.add("show");
    reply.innerHTML = `<span class="tag">thinking</span> Routing "${escapeHtml(q)}"…`;
    // First, try client-side intent (deterministic) — filter month, compare, etc.
    const local = localRoute(q);
    if (local) { reply.innerHTML = local; return; }
    // Otherwise call the AI backend (returns a narration; graceful fallback if unreachable)
    try {
      const ctx = {
        country: state.country,
        months: state.months,
        latest: aggregateAllMonths(state.wageCode).slice(-1)[0],
        trend: aggregateAllMonths(state.wageCode)
      };
      const r = await fetch("/api/payroll-query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, context: ctx })
      });
      if (!r.ok) throw new Error("api " + r.status);
      const j = await r.json();
      reply.innerHTML = `<span class="tag">${j.intent || "ai"}</span>${escapeHtml(j.narration || j.reply || "No response")}`;
    } catch (e) {
      reply.innerHTML = `<span class="tag">offline</span>AI agent unreachable. Try phrases: "show gross trend", "compare March vs February", "Apr 2026 totals", "top 3 departments by cost".`;
    }
  };
  btn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
}

function localRoute(q) {
  const lc = q.toLowerCase();
  const trend = aggregateAllMonths(state.wageCode);
  // "show totals for <month>"
  const monthMatch = lc.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})?/);
  if (monthMatch) {
    const monNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const mon = monNames.indexOf(monthMatch[1]) + 1;
    const row = trend.find(t => {
      const [y, m] = t.month.split("-").map(Number);
      return m === mon && (!monthMatch[2] || Number(monthMatch[2]) === y);
    });
    if (row) return `<span class="tag">filter</span>${fmtMonth(row.month)} — Gross ${compact(row.gross)}, Net ${compact(row.netPay)}, PF ${compact(row.employerPF + row.employeePF)}, TDS ${compact(row.tds)}.`;
  }
  // "compare march vs february" or "q1"
  if (/\bq1\b/.test(lc)) {
    const q1 = trend.filter(t => ["2026-01","2026-02","2026-03"].includes(t.month));
    const sum = q1.reduce((a, x) => a + x.employerPF + x.employeePF, 0);
    return `<span class="tag">aggregate</span>Q1 2026 PF outflow: ${compact(sum)} across ${q1.length} months.`;
  }
  // "top departments"
  if (/top.*(dept|department)/.test(lc)) {
    const latest = state.months.slice(-1)[0];
    const byDept = {};
    const empMap = Object.fromEntries(state.employees.map(e => [e.id, e]));
    for (const r of (state.runs[latest] || [])) {
      const e = empMap[r.id]; if (!e) continue;
      const out = state.engine.computeMonthly(e, r, { wageCode: state.wageCode, taxRegime: e.regime });
      byDept[e.dept] = (byDept[e.dept] || 0) + out.employerCost;
    }
    const top = Object.entries(byDept).sort((a,b) => b[1] - a[1]).slice(0,3);
    return `<span class="tag">ranking</span>Top depts by employer cost (${fmtMonth(latest)}): ` + top.map(([d,v]) => `${d} (${compact(v)})`).join(", ");
  }
  // "trend" — show mini summary
  if (/trend|6.?month|six month/.test(lc)) {
    const totalGross = trend.reduce((a,x) => a+x.gross, 0);
    const totalNet = trend.reduce((a,x) => a+x.netPay, 0);
    return `<span class="tag">trend</span>Last ${trend.length} months — Gross ${compact(totalGross)}, Net ${compact(totalNet)}, PF ${compact(trend.reduce((a,x) => a+x.employerPF+x.employeePF, 0))}.`;
  }
  return null;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

boot().catch(e => {
  console.error(e);
  document.getElementById("impactBanner").textContent = "Error loading dashboard: " + e.message;
});
