// Updates page — Updates Agent fetches/serves a live compliance feed.

const $ = (id) => document.getElementById(id);
let activeCountry = "ALL";

function renderFeed(items) {
  if (!items.length) {
    $("feed").innerHTML = `<p class="disclaimer">No updates found.</p>`;
    return;
  }
  $("feed").innerHTML = items.map(it => `
    <div class="feed-item">
      <div class="meta">${it.country} • ${it.date} • ${it.category}</div>
      <h4>${it.title}</h4>
      <p>${it.summary}</p>
      ${it.source ? `<p style="margin-top:6px"><a href="${it.source}" target="_blank" rel="noopener">Source ↗</a></p>` : ""}
    </div>`).join("");
}

async function loadFeed(country = "ALL", refresh = false) {
  $("feed").innerHTML = `<p class="loading">Updates Agent fetching feed…</p>`;
  try {
    const url = `/api/updates?country=${country}${refresh ? "&refresh=1" : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    renderFeed(data.items || []);
  } catch (e) {
    // Fallback to static cache
    try {
      const res = await fetch("/data/updates.json");
      const data = await res.json();
      const filtered = country === "ALL" ? data.items : data.items.filter(i => i.country === country);
      renderFeed(filtered);
    } catch {
      $("feed").innerHTML = `<p class="disclaimer">Feed unavailable.</p>`;
    }
  }
}

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeCountry = chip.dataset.country;
    loadFeed(activeCountry);
  });
});

$("refreshBtn").addEventListener("click", () => loadFeed(activeCountry, true));

loadFeed();
