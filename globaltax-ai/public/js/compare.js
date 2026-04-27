// Compare page — runs the same USD-equivalent income through every rule engine.

import { calculate } from "/js/rule-engine/index.js";

// Indicative static FX rates (1 USD = X local). Replace with live API in prod.
const FX = {
  IN: 83.5, US: 1, GB: 0.79, CA: 1.36, AU: 1.50,
  DE: 0.92, SG: 1.30, IE: 0.92, NL: 0.92, JP: 148,
  BR: 5.0, ZA: 18.5, AE: 3.67, SA: 3.75, EG: 48
};

function fmt(n, currency) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

const defaults = {
  IN: { regime: "new", deductions80C: 0 },
  US: { filing: "single", state: "CA" },
  AE: { nationality: "expat" },
  SA: { nationality: "expat", includeZakat: false },
  EG: {}
};

function runAll(usd) {
  const rows = [];
  for (const [code, params] of Object.entries(defaults)) {
    const fx = FX[code];
    const local = usd * fx;
    const r = calculate(code, { grossAnnualIncome: local, ...params });
    rows.push({
      code,
      flag: { IN:"🇮🇳", US:"🇺🇸", AE:"🇦🇪", SA:"🇸🇦", EG:"🇪🇬" }[code],
      name: r.country,
      currency: r.currency,
      gross: local,
      tax: r.totalTax,
      takeHome: r.takeHome,
      effective: r.effectiveRate,
      takeHomeUsd: r.takeHome / fx
    });
  }
  rows.sort((a, b) => b.takeHomeUsd - a.takeHomeUsd);
  return rows;
}

function render(rows) {
  document.getElementById("compareResult").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Country</th>
          <th>Gross (local)</th>
          <th>Total tax</th>
          <th>Take home</th>
          <th>Effective</th>
          <th>Take home (USD)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr>
            <td>${r.flag} ${r.name} ${i===0 ? '<span class="badge ok">best</span>' : ''}</td>
            <td>${fmt(r.gross, r.currency)}</td>
            <td>${fmt(r.tax, r.currency)}</td>
            <td>${fmt(r.takeHome, r.currency)}</td>
            <td>${r.effective}%</td>
            <td>${fmt(r.takeHomeUsd, "USD")}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <p class="disclaimer">Highest take-home isn't the whole picture — cost of living, healthcare, and benefits change the ranking substantially.</p>
  `;
}

document.getElementById("compareBtn").addEventListener("click", () => {
  const usd = Number(document.getElementById("usdIncome").value) || 0;
  render(runAll(usd));
});

// Run once on load
render(runAll(80000));
