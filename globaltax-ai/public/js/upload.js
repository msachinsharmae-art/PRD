// CSV upload + schema validator + localStorage persistence.
// Dashboard reads gt_upload_<COUNTRY> if set; falls back to seeded JSON otherwise.

const SCHEMAS = {
  IN: {
    empRequired: ["id", "name", "designation", "dept", "state", "doj", "ctc"],
    empOptional: ["location", "pan", "uan", "regime", "metro"],
    runRequired: ["month", "id", "lop", "bonus", "reimburse"],
    hint: "Headers: id,name,designation,dept,state,location,doj,ctc,pan,uan,regime,metro. CTC is annual INR. regime = new|old. metro = true|false.",
    seedEmp: "/data/payroll/employees.json",
    seedRuns: "/data/payroll/runs-raw.json"
  },
  US: {
    empRequired: ["id", "name", "designation", "dept", "state", "doj", "salary", "filing"],
    runRequired: ["month", "id", "lop", "bonus", "reimburse"],
    hint: "Headers: id,name,designation,dept,state,location,doj,salary,filing,ssn. filing = single|marriedJoint. Salary = annual USD.",
    seedEmp: "/data/payroll/employees-us.json",
    seedRuns: "/data/payroll/runs-raw-us.json"
  },
  AE: {
    empRequired: ["id", "name", "designation", "dept", "emirate", "doj", "salary", "nationality"],
    runRequired: ["month", "id", "lop", "bonus", "reimburse"],
    hint: "Headers: id,name,designation,dept,emirate,doj,salary,nationality,basicPct,housingPct. nationality = UAE|GCC|IN|UK|...",
    seedEmp: "/data/payroll/employees-uae.json",
    seedRuns: "/data/payroll/runs-raw-uae.json"
  },
  SA: {
    empRequired: ["id", "name", "designation", "dept", "city", "doj", "salary", "nationality"],
    runRequired: ["month", "id", "lop", "bonus", "reimburse"],
    hint: "Headers: id,name,designation,dept,city,doj,salary,nationality,basicPct,housingPct. nationality = SA|GCC|IN|PK|...",
    seedEmp: "/data/payroll/employees-ksa.json",
    seedRuns: "/data/payroll/runs-raw-ksa.json"
  }
};

let state = { country: "IN", emp: null, runs: null };

document.querySelectorAll("[data-country]").forEach(b => {
  b.addEventListener("click", () => {
    document.querySelectorAll("[data-country]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    state.country = b.dataset.country;
    updateHint();
    updateSaveBtn();
  });
});

function updateHint() {
  document.getElementById("empSchemaHint").textContent = "Required: " + SCHEMAS[state.country].empRequired.join(", ") + ". " + SCHEMAS[state.country].hint;
}
updateHint();

wireDrop("empDrop", "empFile", (f) => handleEmp(f));
wireDrop("runDrop", "runFile", (f) => handleRun(f));

function wireDrop(dropId, fileId, cb) {
  const drop = document.getElementById(dropId);
  const input = document.getElementById(fileId);
  drop.addEventListener("click", () => input.click());
  input.addEventListener("change", () => { if (input.files[0]) cb(input.files[0]); });
  ["dragenter","dragover"].forEach(e => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add("drag"); }));
  ["dragleave","drop"].forEach(e => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove("drag"); }));
  drop.addEventListener("drop", (ev) => { const f = ev.dataTransfer.files[0]; if (f) cb(f); });
}

async function handleEmp(file) {
  const text = await file.text();
  const rows = parseCSV(text);
  const schema = SCHEMAS[state.country];
  const missing = schema.empRequired.filter(k => !rows.headers.includes(k));
  const div = document.getElementById("empPreview");
  if (missing.length) {
    div.innerHTML = `<p class="bad">Missing columns: ${missing.join(", ")}. Got: ${rows.headers.join(", ")}</p>`;
    state.emp = null;
  } else {
    state.emp = rows;
    div.innerHTML = `<p class="ok">✓ ${rows.data.length} employees, ${rows.headers.length} columns recognized.</p>${tablePreview(rows)}`;
  }
  updateSaveBtn();
}

async function handleRun(file) {
  const text = await file.text();
  const rows = parseCSV(text);
  const schema = SCHEMAS[state.country];
  const missing = schema.runRequired.filter(k => !rows.headers.includes(k));
  const div = document.getElementById("runPreview");
  if (missing.length) {
    div.innerHTML = `<p class="bad">Missing columns: ${missing.join(", ")}. Got: ${rows.headers.join(", ")}</p>`;
    state.runs = null;
  } else {
    state.runs = rows;
    const months = [...new Set(rows.data.map(r => r.month))];
    div.innerHTML = `<p class="ok">✓ ${rows.data.length} rows across ${months.length} months (${months.slice(0,4).join(", ")}${months.length > 4 ? "…" : ""}).</p>${tablePreview(rows)}`;
  }
  updateSaveBtn();
}

function updateSaveBtn() {
  const ok = state.emp && state.runs;
  document.getElementById("saveBtn").disabled = !ok;
}

document.getElementById("saveBtn").addEventListener("click", () => {
  if (!state.emp || !state.runs) return;
  const employees = state.emp.data.map(normalizeEmp);
  const runs = groupByMonth(state.runs.data);
  const months = Object.keys(runs).sort();
  const payload = { employees, runs, months };
  localStorage.setItem("gt_upload_" + state.country, JSON.stringify(payload));
  document.getElementById("saveStatus").textContent = `Saved. Opening dashboard…`;
  setTimeout(() => { location.href = "/dashboard"; }, 700);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  localStorage.removeItem("gt_upload_" + state.country);
  document.getElementById("saveStatus").textContent = `Cleared stored data for ${state.country}.`;
});

document.querySelectorAll("[data-sample]").forEach(b => {
  b.addEventListener("click", async () => {
    const c = b.dataset.sample;
    const emp = await fetch(SCHEMAS[c].seedEmp).then(r => r.json());
    const runs = await fetch(SCHEMAS[c].seedRuns).then(r => r.json());
    const empCsv = toCSV(emp.employees);
    const runRows = [];
    for (const [month, rows] of Object.entries(runs.runs)) {
      for (const r of rows) runRows.push({ month, ...r });
    }
    const runCsv = toCSV(runRows);
    downloadText(`employees-${c}.csv`, empCsv);
    downloadText(`runs-${c}.csv`, runCsv);
  });
});

function normalizeEmp(row) {
  const clone = { ...row };
  // coerce numerics
  for (const k of ["ctc","salary","basicPct","housingPct"]) {
    if (clone[k] !== undefined && clone[k] !== "") clone[k] = Number(clone[k]);
  }
  if (clone.metro !== undefined) clone.metro = String(clone.metro).toLowerCase() === "true";
  return clone;
}

function groupByMonth(rows) {
  const by = {};
  for (const r of rows) {
    if (!by[r.month]) by[r.month] = [];
    by[r.month].push({
      id: r.id,
      lop: Number(r.lop) || 0,
      bonus: Number(r.bonus) || 0,
      reimburse: Number(r.reimburse) || 0
    });
  }
  return by;
}

// ─── CSV parse/serialize (simple, quote-aware) ───────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const split = (line) => {
    const out = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (q && line[i+1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const headers = split(lines[0]).map(h => h.trim());
  const data = lines.slice(1).map(line => {
    const cells = split(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? "").trim(); });
    return obj;
  });
  return { headers, data };
}
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
}
function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function tablePreview(parsed) {
  const sample = parsed.data.slice(0, 5);
  const head = `<tr>${parsed.headers.map(h => `<th>${h}</th>`).join("")}</tr>`;
  const body = sample.map(r => `<tr>${parsed.headers.map(h => `<td>${(r[h] || "").toString().slice(0,40)}</td>`).join("")}</tr>`).join("");
  return `<div class="preview-table"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}
