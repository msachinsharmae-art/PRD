// Compliance Calendar v2 — integrates payroll burn analytics with filing deadlines.
// Reacts to the country selector in the shell topbar.

const COUNTRY_CFG = {
  IN: { label: "India",         enginePath: "/js/rule-engine/india-payroll/index.js",  empPath: "/data/payroll/employees.json",     runsPath: "/data/payroll/runs-raw.json",     calPath: "/data/compliance/in-calendar-2026.json" },
  US: { label: "United States", enginePath: "/js/rule-engine/us-payroll/index.js",     empPath: "/data/payroll/employees-us.json",  runsPath: "/data/payroll/runs-raw-us.json",  calPath: "/data/compliance/us-calendar-2026.json" },
  AE: { label: "UAE",           enginePath: "/js/rule-engine/uae-payroll/index.js",    empPath: "/data/payroll/employees-uae.json", runsPath: "/data/payroll/runs-raw-uae.json", calPath: "/data/compliance/uae-calendar-2026.json" },
  SA: { label: "Saudi Arabia",  enginePath: "/js/rule-engine/ksa-payroll/index.js",    empPath: "/data/payroll/employees-ksa.json", runsPath: "/data/payroll/runs-raw-ksa.json", calPath: "/data/compliance/ksa-calendar-2026.json" },
  EG: { label: "Egypt",         enginePath: "/js/rule-engine/egypt-payroll/index.js",  empPath: "/data/payroll/employees-eg.json",  runsPath: "/data/payroll/runs-raw-eg.json",  calPath: "/data/compliance/eg-calendar-2026.json" }
};
const CUR = { IN: "₹", US: "$", AE: "AED ", SA: "SAR ", EG: "EGP " };

const state = {
  country: localStorage.getItem("gt_country") || "IN",
  range: 3,
  catFilter: "all",
  employees: [], runs: {}, months: [], calendar: [], engine: null,
  chart: null,
  // Month-grid state
  view: new Date(),                       // first of currently-viewed month
  scope: "current",                       // "current" | "all"
  catFilterCal: "all",                    // separate filter for the grid
  selectedDate: null,                     // ISO yyyy-mm-dd
  allCountriesCal: null                   // lazy-loaded merged calendar
};

function compact(n, code = state.country) {
  const sym = CUR[code];
  if (code === "IN") {
    if (Math.abs(n) >= 1e7) return sym + (n / 1e7).toFixed(2) + " Cr";
    if (Math.abs(n) >= 1e5) return sym + (n / 1e5).toFixed(2) + " L";
  } else {
    if (Math.abs(n) >= 1e6) return sym + (n / 1e6).toFixed(2) + "M";
    if (Math.abs(n) >= 1e3) return sym + (n / 1e3).toFixed(1) + "k";
  }
  return sym + Math.round(n || 0).toLocaleString("en");
}

async function boot() {
  await loadCountry(state.country);
  // Anchor month view to today on first paint
  state.view = new Date();
  state.view.setDate(1);
  wireHandlers();
  wireCalendarGrid();
  renderAll();
  renderMonthGrid();
  window.addEventListener("gt:country", (e) => {
    state.country = e.detail;
    loadCountry(state.country).then(() => { renderAll(); renderMonthGrid(); });
  });

  // Expose page context to AI drawer
  window.__GT_PAGE_CTX__ = () => {
    const agg = aggregateMonths(state.range);
    const upcoming = state.calendar
      .filter(e => { const d = new Date(e.date); const days = (d - new Date()) / 86400000; return days >= 0 && days <= 30; })
      .slice(0, 5)
      .map(e => ({ date: e.date, title: e.title, category: e.category }));
    return {
      page: "calendar",
      country: state.country,
      range_months: state.range,
      category_filter: state.catFilter,
      totals: {
        headcount_avg: Math.round(agg.reduce((a, x) => a + x.headcount, 0) / Math.max(1, agg.length)),
        total_gross: agg.reduce((a, x) => a + x.gross, 0),
        total_net: agg.reduce((a, x) => a + x.netPay, 0),
        employer_cost: agg.reduce((a, x) => a + x.employerCost, 0),
        statutory_outflow: agg.reduce((a, x) => a + x.employerPF + x.employeePF + x.tds + x.pt + x.gratuityAccrual, 0)
      },
      upcoming_filings: upcoming
    };
  };
}

async function loadCountry(code) {
  const cfg = COUNTRY_CFG[code];
  const nameEl = document.getElementById("countryName");
  if (nameEl) nameEl.textContent = cfg.label;
  state.engine = await import(cfg.enginePath);
  const [e, r, c] = await Promise.all([
    fetch(cfg.empPath).then(r => r.json()),
    fetch(cfg.runsPath).then(r => r.json()),
    fetch(cfg.calPath).then(r => r.json())
  ]);
  state.employees = e.employees;
  state.runs = r.runs;
  state.months = r.meta.months;
  state.calendar = c.events;
}

function wireHandlers() {
  document.querySelectorAll("[data-range]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("[data-range]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    state.range = Number(b.dataset.range);
    renderAll();
  }));
  document.querySelectorAll("[data-cat]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("[data-cat]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    state.catFilter = b.dataset.cat;
    renderDeadlines();
  }));
}

function aggregateMonths(n) {
  const take = state.months.slice(-n);
  return take.map(m => {
    const rows = state.runs[m] || [];
    const { totals } = state.engine.runMonth(state.employees, rows, {});
    return { month: m, ...totals };
  });
}

function renderAll() {
  const agg = aggregateMonths(state.range);
  renderKPIs(agg);
  renderBurnChart(agg);
  renderDeadlines();
}

function renderKPIs(agg) {
  const totalGross = agg.reduce((a, x) => a + x.gross, 0);
  const totalNet   = agg.reduce((a, x) => a + x.netPay, 0);
  const totalEr    = agg.reduce((a, x) => a + x.employerCost, 0);
  const totalStat  = agg.reduce((a, x) => a + x.employerPF + x.employeePF + x.tds + x.pt + x.gratuityAccrual, 0);
  const avgHC      = Math.round(agg.reduce((a, x) => a + x.headcount, 0) / Math.max(1, agg.length));
  const perHead    = avgHC ? Math.round(totalEr / avgHC) : 0;

  document.getElementById("burnKpis").innerHTML = `
    <div class="kpi-mini"><div class="l">Headcount (avg)</div><div class="v">${avgHC}</div><div class="s">across ${agg.length} months</div></div>
    <div class="kpi-mini"><div class="l">Total gross paid</div><div class="v">${compact(totalGross)}</div><div class="s">employee in-hand + bonus</div></div>
    <div class="kpi-mini"><div class="l">Net pay disbursed</div><div class="v">${compact(totalNet)}</div><div class="s">after all deductions</div></div>
    <div class="kpi-mini"><div class="l">Total employer cost</div><div class="v">${compact(totalEr)}</div><div class="s">per-head ${compact(perHead)}</div></div>
    <div class="kpi-mini"><div class="l">Statutory outflow</div><div class="v">${compact(totalStat)}</div><div class="s">PF/ESI/PT/TDS/gratuity</div></div>
    <div class="kpi-mini"><div class="l">Peak month</div><div class="v">${fmtMonth([...agg].sort((a,b) => b.gross - a.gross)[0]?.month || "")}</div><div class="s">highest gross outlay</div></div>
    <div class="kpi-mini"><div class="l">Avg monthly outflow</div><div class="v">${compact(totalEr / Math.max(1, agg.length))}</div><div class="s">employer cost/mo</div></div>
    <div class="kpi-mini"><div class="l">Net : Employer ratio</div><div class="v">${totalEr ? (totalNet / totalEr * 100).toFixed(1) + "%" : "—"}</div><div class="s">take-home as % of CTC</div></div>
  `;
}

function renderBurnChart(agg) {
  const ctx = document.getElementById("burnChart");
  state.chart?.destroy();
  state.chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: agg.map(m => fmtMonth(m.month)),
      datasets: [
        { label: "Net pay (disbursed)",     data: agg.map(m => m.netPay),                    backgroundColor: "#10B981" },
        { label: "Employer PF / FICA",      data: agg.map(m => m.employerPF),                backgroundColor: "#635BFF" },
        { label: "Employee PF / FICA",      data: agg.map(m => m.employeePF),                backgroundColor: "#A28BFF" },
        { label: "TDS / Income tax",        data: agg.map(m => m.tds),                       backgroundColor: "#EF4444" },
        { label: "Gratuity accrual",        data: agg.map(m => m.gratuityAccrual),           backgroundColor: "#F59E0B" },
        { label: "PT + Martyrs Fund",       data: agg.map(m => m.pt),                        backgroundColor: "#64748B" }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#1F2D3D", boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${compact(c.parsed.y)}` } }
      },
      scales: {
        x: { stacked: true, ticks: { color: "#64748B" }, grid: { display: false } },
        y: { stacked: true, ticks: { color: "#64748B", callback: v => compact(v) }, grid: { color: "rgba(17,24,39,0.06)" } }
      }
    }
  });
}

function renderDeadlines() {
  const today = new Date();
  const end = new Date(); end.setDate(end.getDate() + 90);
  const rows = state.calendar
    .filter(e => {
      const d = new Date(e.date);
      return d >= new Date(today.getTime() - 3 * 86400000) && d <= end
        && (state.catFilter === "all" || e.category === state.catFilter);
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  document.getElementById("deadlineCount").textContent = rows.length + " items";
  const list = document.getElementById("deadlineList");
  list.innerHTML = rows.length ? rows.map(e => {
    const d = new Date(e.date);
    const days = Math.round((d - today) / 86400000);
    const pill = days < 0 ? "past" : days <= 3 ? "urgent" : days <= 14 ? "soon" : "ok";
    const text = days < 0 ? `${-days}d ago` : days === 0 ? "Today" : `${days}d`;
    return `
      <div class="deadline-item">
        <div class="deadline-date"><span class="d">${d.getDate()}</span><span class="m">${d.toLocaleString("en", { month: "short" })}</span></div>
        <div class="deadline-body">
          <span class="cat ${e.category}">${e.category.toUpperCase()}</span>
          <span>${e.title}</span>
          <span class="countdown ${pill}">${text}</span>
          ${e.act ? `<div class="act">${e.act}</div>` : ""}
          ${e.penalty ? `<div class="penalty">⚠ ${e.penalty}</div>` : ""}
        </div>
      </div>
    `;
  }).join("") : `<p class="muted">No matching deadlines.</p>`;
}

function fmtMonth(ym) {
  if (!ym) return "—";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", { month: "short", year: "2-digit" });
}

// ─── Month-grid calendar ────────────────────────────────────────────
const ALL_CAL_PATHS = {
  IN: "/data/compliance/in-calendar-2026.json",
  US: "/data/compliance/us-calendar-2026.json",
  AE: "/data/compliance/uae-calendar-2026.json",
  SA: "/data/compliance/ksa-calendar-2026.json",
  EG: "/data/compliance/eg-calendar-2026.json"
};
const COUNTRY_FLAG = { IN: "🇮🇳", US: "🇺🇸", AE: "🇦🇪", SA: "🇸🇦", EG: "🇪🇬" };
const COUNTRY_NAME = { IN: "India", US: "United States", AE: "UAE", SA: "Saudi Arabia", EG: "Egypt" };

async function loadAllCountriesCal() {
  if (state.allCountriesCal) return state.allCountriesCal;
  const entries = await Promise.all(Object.entries(ALL_CAL_PATHS).map(async ([code, path]) => {
    try {
      const j = await fetch(path).then(r => r.json());
      return (j.events || []).map(e => ({ ...e, country: code }));
    } catch { return []; }
  }));
  state.allCountriesCal = entries.flat();
  return state.allCountriesCal;
}

function activeCalendar() {
  if (state.scope === "all") return state.allCountriesCal || [];
  return state.calendar.map(e => ({ ...e, country: state.country }));
}

function wireCalendarGrid() {
  document.getElementById("calPrev")?.addEventListener("click", () => {
    state.view.setMonth(state.view.getMonth() - 1);
    renderMonthGrid();
  });
  document.getElementById("calNext")?.addEventListener("click", () => {
    state.view.setMonth(state.view.getMonth() + 1);
    renderMonthGrid();
  });
  document.getElementById("calToday")?.addEventListener("click", () => {
    state.view = new Date(); state.view.setDate(1);
    state.selectedDate = isoDate(new Date());
    renderMonthGrid();
    renderDayCard();
  });
  document.querySelectorAll("[data-scope]").forEach(b => b.addEventListener("click", async () => {
    document.querySelectorAll("[data-scope]").forEach(x => x.classList.toggle("active", x === b));
    state.scope = b.dataset.scope;
    if (state.scope === "all") await loadAllCountriesCal();
    state.selectedDate = null;
    renderMonthGrid();
    renderDayCard();
  }));
  document.querySelectorAll("#calCatChips [data-cat]").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#calCatChips [data-cat]").forEach(x => x.classList.toggle("active", x === b));
    state.catFilterCal = b.dataset.cat;
    renderMonthGrid();
    renderDayCard();
  }));
}

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function renderMonthGrid() {
  const grid = document.getElementById("monthGrid");
  const title = document.getElementById("calMonthTitle");
  if (!grid || !title) return;

  const view = state.view;
  const year = view.getFullYear();
  const month = view.getMonth();
  title.textContent = view.toLocaleString("en", { month: "long", year: "numeric" });

  const events = activeCalendar()
    .filter(e => state.catFilterCal === "all" || e.category === state.catFilterCal);

  // Bucket events by ISO date for fast lookup
  const byDate = {};
  for (const e of events) (byDate[e.date] = byDate[e.date] || []).push(e);

  // First day of month, last day of month
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  // Sunday-based grid: pad start with previous-month days to fill the first row
  const startWeekday = first.getDay();          // 0=Sun
  const totalCells = Math.ceil((startWeekday + last.getDate()) / 7) * 7;

  const today = isoDate(new Date());
  const cells = [];
  // Day-of-week header
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(d => cells.push(`<div class="dow">${d}</div>`));

  for (let i = 0; i < totalCells; i++) {
    const dt = new Date(year, month, 1 - startWeekday + i);
    const iso = isoDate(dt);
    const inMonth = dt.getMonth() === month;
    const evs = byDate[iso] || [];
    const cats = Array.from(new Set(evs.map(e => e.category))).slice(0, 6);
    const ctries = Array.from(new Set(evs.map(e => e.country))).filter(Boolean);
    const dotsHtml = cats.map(c => `<i class="dot ${c}" title="${c}"></i>`).join("");
    const flagsHtml = state.scope === "all" ? ctries.slice(0, 3).map(c => `<span class="flag" title="${COUNTRY_NAME[c] || c}">${COUNTRY_FLAG[c] || c}</span>`).join("") : "";
    const classes = [
      "day",
      inMonth ? "" : "other-month",
      iso === today ? "today" : "",
      evs.length ? "has-events" : "",
      iso === state.selectedDate ? "selected" : ""
    ].filter(Boolean).join(" ");
    cells.push(`
      <div class="${classes}" data-date="${iso}">
        <div class="top">
          <span class="num">${dt.getDate()}</span>
          ${evs.length ? `<span class="count">${evs.length}</span>` : ""}
        </div>
        ${flagsHtml ? `<div class="dots">${flagsHtml}</div>` : ""}
        ${dotsHtml ? `<div class="dots">${dotsHtml}</div>` : ""}
      </div>
    `);
  }
  grid.innerHTML = cells.join("");

  grid.querySelectorAll("[data-date]").forEach(c => c.addEventListener("click", () => {
    state.selectedDate = c.dataset.date;
    renderMonthGrid();
    renderDayCard();
    window.GTAuth?.logActivity?.("calendar_day_click", c.dataset.date);
  }));
}

function renderDayCard() {
  const body = document.getElementById("dayCardBody");
  if (!body) return;
  if (!state.selectedDate) {
    body.innerHTML = `<p class="muted">Tap a highlighted date on the calendar to see all filings, acts, and penalties due that day.</p>`;
    return;
  }
  const events = activeCalendar()
    .filter(e => e.date === state.selectedDate)
    .filter(e => state.catFilterCal === "all" || e.category === state.catFilterCal)
    .sort((a, b) => (a.country || "").localeCompare(b.country || ""));
  const d = new Date(state.selectedDate);
  const niceDate = d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  if (!events.length) {
    body.innerHTML = `
      <div class="day-card-head">
        <h3>${niceDate}</h3>
        <span class="muted">No filings on this date${state.scope === "current" ? ` for ${COUNTRY_NAME[state.country]}` : ""}.</span>
      </div>`;
    return;
  }
  const today = new Date(); today.setHours(0,0,0,0);
  const days = Math.round((d - today) / 86400000);
  const status = days < 0 ? `${-days} day(s) ago` : days === 0 ? "Today" : `${days} day(s) away`;
  body.innerHTML = `
    <div class="day-card-head">
      <h3>${niceDate}</h3>
      <span class="muted">${events.length} filing(s) · <b>${status}</b></span>
    </div>
    ${events.map(e => `
      <div class="day-event">
        <div class="head">
          <span class="cat">${e.category}</span>
          ${e.country ? `<span class="ctry">${COUNTRY_FLAG[e.country] || ""} ${COUNTRY_NAME[e.country] || e.country}</span>` : ""}
        </div>
        <div class="title">${escape(e.title)}</div>
        ${e.act     ? `<div class="act">📜 ${escape(e.act)}</div>` : ""}
        ${e.penalty ? `<div class="penalty">⚠ ${escape(e.penalty)}</div>` : ""}
      </div>
    `).join("")}
  `;
}

function escape(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

boot().catch(e => {
  const el = document.getElementById("burnKpis");
  if (el) el.innerHTML = `<p class="muted">Failed to load: ${e.message}</p>`;
});
