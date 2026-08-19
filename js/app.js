const SEV_COLORS = {
  Minor: '#6B8299',
  Moderate: '#BE8A3D',
  Major: '#B5502E',
  Catastrophic: '#7A2530'
};
const SEV_ORDER = ['Minor', 'Moderate', 'Major', 'Catastrophic'];

let ALL = [];
let filtered = [];
let currentView = 'table';
let sortKey = 'id';
let sortDir = 'asc';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

fetch('data/snags.json')
  .then((r) => r.json())
  .then((data) => {
    ALL = data;
    filtered = data;
    init();
  });

function init() {
  $('#stat-total').textContent = ALL.length;
  populateFilterOptions();
  drawSpatialPlot();
  bindControls();
  applyFilters();
}

function populateFilterOptions() {
  const sections = [...new Set(ALL.map((d) => d.section))].sort();
  const elements = [...new Set(ALL.map((d) => d.elementType))].sort();

  fillSelect('#filter-section', sections);
  fillSelect('#filter-severity', SEV_ORDER.filter((s) => ALL.some((d) => d.severity === s)));
  fillSelect('#filter-element', elements);
}

function fillSelect(sel, values) {
  const el = $(sel);
  values.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    el.appendChild(opt);
  });
}

function bindControls() {
  $$('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach((b) => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      currentView = btn.dataset.view;
      $$('.view').forEach((v) => v.classList.remove('active'));
      $(`#view-${currentView}`).classList.add('active');
      render();
    });
  });

  $('#filter-search').addEventListener('input', applyFilters);
  $('#filter-section').addEventListener('change', applyFilters);
  $('#filter-severity').addEventListener('change', applyFilters);
  $('#filter-element').addEventListener('change', applyFilters);
  $('#filter-reset').addEventListener('click', () => {
    $('#filter-search').value = '';
    $('#filter-section').value = '';
    $('#filter-severity').value = '';
    $('#filter-element').value = '';
    applyFilters();
  });

  $$('#snag-table thead th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey = key;
        sortDir = 'asc';
      }
      $$('#snag-table thead th').forEach((h) => h.classList.remove('sorted', 'desc'));
      th.classList.add('sorted');
      if (sortDir === 'desc') th.classList.add('desc');
      render();
    });
  });

  $('#detail-close').addEventListener('click', closeDetail);
  $('#detail-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'detail-backdrop') closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });
}

function applyFilters() {
  const q = $('#filter-search').value.trim().toLowerCase();
  const section = $('#filter-section').value;
  const severity = $('#filter-severity').value;
  const element = $('#filter-element').value;

  filtered = ALL.filter((d) => {
    if (section && d.section !== section) return false;
    if (severity && d.severity !== severity) return false;
    if (element && d.elementType !== element) return false;
    if (q) {
      const hay = `${d.id} ${d.failure} ${d.material} ${d.orientation}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  $('#result-count').textContent = filtered.length;
  render();
  highlightPlot();
}

function sortedData() {
  const arr = [...filtered];
  arr.sort((a, b) => {
    let av = a[sortKey];
    let bv = b[sortKey];
    if (sortKey === 'severity') {
      av = SEV_ORDER.indexOf(a.severity);
      bv = SEV_ORDER.indexOf(b.severity);
    }
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  return arr;
}

function render() {
  if (currentView === 'table') renderTable();
  else renderGallery();
}

function renderTable() {
  const body = $('#table-body');
  body.innerHTML = '';
  const frag = document.createDocumentFragment();
  sortedData().forEach((d) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${d.id}</td>
      <td>${d.section}</td>
      <td>${d.elementType}</td>
      <td>${d.material || '—'}</td>
      <td>${d.failure || '—'}</td>
      <td><span class="sev-badge sev-${d.severity}">${d.severity}</span></td>
      <td>${d.progression || '—'}</td>
    `;
    tr.addEventListener('click', () => openDetail(d));
    frag.appendChild(tr);
  });
  body.appendChild(frag);
}

function renderGallery() {
  const grid = $('#gallery-grid');
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  sortedData().forEach((d) => {
    const card = document.createElement('div');
    card.className = 'snag-card';
    card.innerHTML = `
      <img class="thumb" src="images/${d.imageRef}.jpg" alt="Snag ${d.id}, ${d.failure}" loading="lazy">
      <div class="card-body">
        <div class="card-top">
          <span class="snag-id">${d.id}</span>
          <span class="sev-badge sev-${d.severity}">${d.severity}</span>
        </div>
        <p class="card-meta">${d.section} · ${d.elementType}</p>
        <p class="card-meta">${d.failure || '—'}</p>
      </div>
    `;
    card.addEventListener('click', () => openDetail(d));
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

function openDetail(d) {
  const fields = [
    ['Section', d.section],
    ['Element type', d.elementType],
    ['Orientation', d.orientation],
    ['Height (m)', d.height],
    ['Material', d.material],
    ['Failure mode', d.failure],
    ['Progression', d.progression],
    ['Wind exposure', d.windExposure],
    ['Sun exposure', d.sunExposure],
    ['Sand exposure', d.sandExposure],
    ['Structural', d.structural],
    ['Safety', d.safety],
    ['Graded by', d.gradedBy],
    ['Coordinates', `${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}`]
  ];

  $('#detail-body').innerHTML = `
    <img class="detail-image" src="images/${d.imageRef}.jpg" alt="Snag ${d.id}">
    <div class="detail-content">
      <h2>${d.id}</h2>
      <p class="detail-sub"><span class="sev-badge sev-${d.severity}">${d.severity}</span> &nbsp; Image ref: ${d.imageRef}</p>
      <dl class="detail-grid">
        ${fields.map(([k, v]) => `
          <div class="detail-field">
            <dt>${k}</dt>
            <dd>${v || '—'}</dd>
          </div>
        `).join('')}
      </dl>
    </div>
  `;
  $('#detail-backdrop').classList.add('open');
}

function closeDetail() {
  $('#detail-backdrop').classList.remove('open');
}

/* ---------- Spatial plot ---------- */

function drawSpatialPlot() {
  const svg = $('#spatial-plot');
  const W = 640, H = 220, PAD = 18;

  const lats = ALL.map((d) => d.lat);
  const lngs = ALL.map((d) => d.lng);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lngMin = Math.min(...lngs), lngMax = Math.max(...lngs);

  const x = (lng) => PAD + ((lng - lngMin) / (lngMax - lngMin)) * (W - PAD * 2);
  const y = (lat) => H - PAD - ((lat - latMin) / (latMax - latMin)) * (H - PAD * 2);

  let dots = '';
  ALL.forEach((d) => {
    dots += `<circle class="plot-dot" data-section="${d.section}" cx="${x(d.lng).toFixed(1)}" cy="${y(d.lat).toFixed(1)}" r="3.2" fill="${SEV_COLORS[d.severity]}" fill-opacity="0.8"></circle>`;
  });

  svg.innerHTML = dots;

  const legend = $('#plot-legend');
  legend.innerHTML = SEV_ORDER.map((s) => `
    <li><span class="legend-dot" style="background:${SEV_COLORS[s]}"></span>${s}</li>
  `).join('');
}

function highlightPlot() {
  const activeIds = new Set(filtered.map((d) => d.imageRef));
  $$('#spatial-plot .plot-dot').forEach((dot, i) => {
    const d = ALL[i];
    const on = filtered.includes(d);
    dot.setAttribute('fill-opacity', on ? '0.85' : '0.12');
  });
}
