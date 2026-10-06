import './style.css';
import { initEphemeris, dateToJd, jdToDate } from './astro/ephemeris.js';
import { natalFromBirth, buildChart, formatPos, houseOf, withSolarHouses } from './astro/chart.js';
import { transitAspects } from './astro/aspects.js';
import { forecast, aspectPasses } from './astro/transits.js';
import { isValidTimeZone } from './astro/time.js';
import { describeAspect, describeEvent, buildReading, skyToday, natalPortrait, natalLabel, ordinal } from './astro/interpret.js';
import { PLANETS, SIGNS, HOUSES } from './data/astro-data.js';
import { renderWheel } from './ui/wheel.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const VS = '︎';
const STORE_KEY = 'transit-chart.profile';

const EXAMPLE = { name: 'Example chart', date: '1990-07-04', time: '14:30', timeUnknown: false, place: 'New York, United States', lat: 40.7128, lon: -74.006, tz: 'America/New_York' };

const state = {
  profile: null,
  natal: null,
  now: new Date(),
  when: new Date(),
  tab: 'reading',
  selected: null,
  forecastDays: 90,
  filters: { aspect: true, station: true, ingress: true, lunation: true, minor: false },
  cache: {},
};

/* ---------- formatting ---------- */
const fmtDate = (jd, opts = { month: 'short', day: 'numeric' }) => jdToDate(jd).toLocaleDateString(undefined, opts);
const fmtDateLong = (jd) => jdToDate(jd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const g = (key) => `<span class="g">${PLANETS[key].glyph}${VS}</span>`;
const sg = (i) => `<span class="g">${SIGNS[i].glyph}${VS}</span>`;
const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const toneLabel = { challenging: 'Challenging', flowing: 'Flowing', intense: 'Conjunction' };

/* ---------- compute ---------- */
function computeNatal(profile) {
  const [year, month, day] = profile.date.split('-').map(Number);
  const [hour, minute] = (profile.timeUnknown ? '12:00' : profile.time || '12:00').split(':').map(Number);
  let natal = natalFromBirth({ year, month, day, hour, minute, timeZone: profile.tz, lat: +profile.lat, lon: +profile.lon });
  if (profile.timeUnknown) natal = withSolarHouses(natal);
  natal.timeUnknown = !!profile.timeUnknown;
  return natal;
}

function current() {
  const key = `${state.when.getTime()}`;
  if (state.cache.key === key) return state.cache.data;
  const jd = dateToJd(state.when);
  const transit = buildChart({ jd, lat: state.natal.lat, lon: state.natal.lon });
  for (const p of Object.values(transit.points)) p.house = houseFor(p.lon);
  let aspects = transitAspects(transit.points, state.natal.points);
  if (state.natal.timeUnknown) aspects = aspects.filter((a) => !['asc', 'mc'].includes(a.target));
  const data = { jd, transit, aspects };
  state.cache = { key, data };
  return data;
}

const houseFor = (lon) => houseOf(lon, state.natal.cusps);

function getForecast(jd, days) {
  const key = `${Math.floor(jd)}:${days}:${state.natal.jd}`;
  if (state.cache.fkey === key) return state.cache.fdata;
  let events = forecast(state.natal, jd, jd + days);
  if (state.natal.timeUnknown) events = events.filter((e) => !(e.type === 'aspect' && ['asc', 'mc'].includes(e.target)));
  state.cache.fkey = key;
  state.cache.fdata = events;
  return events;
}

/* ---------- views ---------- */
function renderProfile() {
  const p = state.profile;
  const n = state.natal;
  const s = n.points;
  $('#profile-summary').innerHTML = `<b>${esc(p.name || 'Your chart')}</b> · ${esc(p.date)}${p.timeUnknown ? '' : ' ' + esc(p.time)} · ${esc(p.place || `${(+p.lat).toFixed(2)}, ${(+p.lon).toFixed(2)}`)}
    · ☉ ${SIGNS[s.sun.sign].name} · ☽ ${SIGNS[s.moon.sign].name}${p.timeUnknown ? '' : ` · Asc ${SIGNS[s.asc.sign].name}`}`;
}

function renderWheelView() {
  const { transit, aspects } = current();
  $('#wheel').innerHTML = renderWheel({ natal: state.natal, transit, aspects, selected: state.selected });
}

function aspectKey(a) {
  return `${a.transit}-${a.aspect}-${a.target}`;
}

function exactText(a, jd) {
  const passes = aspectPasses(a, jd);
  if (!passes.all.length) return '';
  const parts = passes.all.map((j) => `${fmtDateLong(j)}${j < jd ? ' (past)' : ''}`);
  return passes.all.length > 1 ? `Exact on ${parts.join(', ')}: ${passes.all.length} passes` : `Exact on ${parts[0]}`;
}

function aspectCard(a, jd, { withExact = true } = {}) {
  const d = describeAspect(a, state.natal);
  const sel = state.selected === aspectKey(a);
  const exact = withExact ? exactText(a, jd) : '';
  return `<article class="card tcard ${a.tone}${sel ? ' selected' : ''}" data-asp="${aspectKey(a)}">
    <header>
      <span class="glyphs">${PLANETS[a.transit].glyph}${VS} ${a.glyph}${VS} ${PLANETS[a.target].glyph}${VS}</span>
      <h3>${esc(d.title)}</h3>
    </header>
    <p>${esc(d.text)}</p>
    <div class="chips">
      <span class="chip t-${a.tone}">${toneLabel[a.tone]}</span>
      <span class="chip ${a.orb < 1 ? 'hot' : ''}">orb ${a.orb.toFixed(1)}°${a.orb < 1 ? ' · tight' : ''}</span>
      <span class="chip">${esc(d.timing)}</span>
      ${a.retro ? '<span class="chip">retrograde</span>' : ''}
      ${exact ? `<span class="chip hot">${esc(exact)}</span>` : ''}
    </div>
    <p class="muted small" style="margin-top:8px">${esc(d.pace)}</p>
    <div class="tipline"><b>Try:</b> ${esc(d.tip)}</div>
    ${d.avoid ? `<div class="tipline avoid"><b>Mind:</b> ${esc(d.avoid)}</div>` : ''}
  </article>`;
}

function eventGlyph(e) {
  if (e.type === 'aspect') return `${g(e.transit)}<span class="g">${e.glyph}${VS}</span>${g(e.target)}`;
  if (e.type === 'station') return `${g(e.transit)}<span class="g">${e.direction === 'retrograde' ? '℞' : 'D'}</span>`;
  if (e.type === 'ingress') return `${g(e.transit)}${sg(e.sign)}`;
  if (e.type === 'lunation') return `<span class="g">${e.eclipse ? '◉' : e.phase === 'new' ? '●' : '○'}</span>${sg(e.sign)}`;
  return '';
}
const SLOW = ['saturn', 'jupiter', 'uranus', 'neptune', 'pluto', 'chiron'];
const isMinor = (e) => e.type === 'aspect' && ['sun', 'mercury', 'venus', 'mars'].includes(e.transit) && !['sun', 'moon', 'asc', 'mc'].includes(e.target);
const isBig = (e) => e.eclipse || (SLOW.includes(e.transit) && e.type !== 'ingress') || (e.type === 'ingress' && SLOW.includes(e.transit));

function eventRow(e) {
  const d = describeEvent(e, state.natal);
  const when = jdToDate(e.jd);
  return `<div class="ev ${isBig(e) ? 'big' : ''}">
    <div class="date"><b>${when.toLocaleDateString(undefined, { day: 'numeric' })}</b>${when.toLocaleDateString(undefined, { weekday: 'short', month: 'short' })}</div>
    <div><h4>${eventGlyph(e)} ${esc(d.title)}</h4><p>${esc(d.text)}</p></div>
  </div>`;
}

function readingView() {
  const { jd, transit, aspects } = current();
  const events = getForecast(jd, 60);
  const reading = buildReading({ natal: state.natal, transit, aspects, events });
  const sky = skyToday(state.natal, transit);
  const top = aspects.slice(0, 5);
  const upcoming = reading.upcoming.filter((e) => e.type !== 'ingress' || SLOW.includes(e.transit) || e.transit === 'mars').slice(0, 10);
  const when = state.when.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return `
    ${state.natal.timeUnknown ? '<div class="banner">Birth time unknown: houses are calculated from your Sun sign and angles (Asc/MC) are left out.</div>' : ''}
    <section class="card lead">
      <div class="eyebrow">${esc(when)}</div>
      <h2>${esc(reading.headline)}</h2>
      <p>${esc(reading.climateText)} ${esc(reading.focusText)}</p>
      <div class="sky">
        <span><b>${esc(sky.phase)}</b> in ${esc(sky.moonSign)}</span>
        <span>Moon in your <b>${ordinal(sky.moonHouse)} house</b></span>
        <span>Sun in <b>${esc(sky.sunSign)}</b></span>
        ${sky.retros.length ? `<span>Retrograde: <b>${esc(sky.retros.join(', '))}</b></span>` : '<span>No planets retrograde</span>'}
      </div>
    </section>

    <h3 class="section-title">What's touching your chart</h3>
    ${top.length ? top.map((a) => aspectCard(a, jd)).join('') : '<p class="muted">No tight transits to your natal chart right now, a quiet window.</p>'}

    <h3 class="section-title">Do and mind</h3>
    <div class="two">
      <div class="card"><div class="eyebrow">Lean into</div><ul class="plain">${reading.tips.do.map((t) => `<li>${esc(t.text)}<span class="src">${esc(t.source)}</span></li>`).join('')}</ul></div>
      <div class="card"><div class="eyebrow">Watch out for</div><ul class="plain">${reading.tips.avoid.length ? reading.tips.avoid.map((t) => `<li>${esc(t.text)}<span class="src">${esc(t.source)}</span></li>`).join('') : '<li class="muted">Nothing pressing, and this is a good window to move forward.</li>'}</ul></div>
    </div>

    <h3 class="section-title">The long game: slow planets in your houses</h3>
    ${reading.seasons.map((s) => `<div class="card"><h3>${esc(s.title)} · ${ordinal(s.house)} house</h3><p style="margin:0">${esc(s.text)}</p></div>`).join('')}

    <h3 class="section-title">What's coming in the next 60 days</h3>
    <div class="card">${upcoming.length ? upcoming.map(eventRow).join('') : '<p class="muted">Nothing major on the calendar.</p>'}
    <p class="muted small" style="margin:12px 0 0">See the Forecast tab for the full calendar.</p></div>

    <p class="disclaimer">Astrology offers a framework for reflection. Read these as tendencies and timing, not fixed outcomes. For health, money or legal decisions, rely on qualified professionals.</p>`;
}

function transitsView() {
  const { jd, aspects } = current();
  const sel = aspects.find((a) => aspectKey(a) === state.selected);
  const rows = aspects.slice(0, 40).map((a) => {
    const max = aspects[0].strength;
    return `<tr class="row ${aspectKey(a) === state.selected ? 'selected' : ''}" data-asp="${aspectKey(a)}">
      <td>${g(a.transit)}${esc(PLANETS[a.transit].name)}${a.retro ? ' ℞' : ''}</td>
      <td class="t-${a.tone}"><span class="g">${a.glyph}${VS}</span>${esc(a.aspect)}</td>
      <td>${g(a.target)}${esc(natalLabel(a.target).replace('natal ', ''))}</td>
      <td>${a.orb.toFixed(2)}°</td>
      <td>${a.applying ? 'applying' : 'separating'}</td>
      <td><div class="bar"><i style="width:${Math.max(6, (a.strength / max) * 100)}%"></i></div></td>
    </tr>`;
  }).join('');
  return `
    ${sel ? aspectCard(sel, jd) : '<p class="muted">Select a line on the wheel or a row below to read it in detail.</p>'}
    <div class="card"><table>
      <thead><tr><th>Transiting</th><th>Aspect</th><th>Natal</th><th>Orb</th><th>Phase</th><th>Weight</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="muted">No active aspects.</td></tr>'}</tbody>
    </table></div>`;
}

function forecastView() {
  const { jd } = current();
  const events = getForecast(jd, state.forecastDays).filter((e) => state.filters[e.type] && (state.filters.minor || !isMinor(e)));
  const chips = [['aspect', 'Exact aspects'], ['station', 'Stations'], ['ingress', 'Sign changes'], ['lunation', 'New & full moons'], ['minor', 'Minor fast-planet aspects']]
    .map(([k, l]) => `<span class="chip ${state.filters[k] ? 'on' : ''}" data-filter="${k}">${l}</span>`).join('');
  let html = `<div class="filters">${chips}
    <select id="fdays">${[30, 90, 180, 365].map((d) => `<option value="${d}" ${d === state.forecastDays ? 'selected' : ''}>Next ${d} days</option>`).join('')}</select></div>`;
  let month = '';
  for (const e of events) {
    const m = jdToDate(e.jd).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    if (m !== month) { month = m; html += `<div class="month">${esc(m)}</div>`; }
    html += eventRow(e);
  }
  if (!events.length) html += '<p class="muted">No events match these filters.</p>';
  return html;
}

function natalView() {
  const n = state.natal;
  const port = natalPortrait(n);
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node', 'lilith'];
  if (!n.timeUnknown) keys.push('asc', 'mc');
  const rows = keys.map((k) => {
    const p = n.points[k];
    return `<tr><td>${g(k)}${esc(PLANETS[k].name)}</td><td>${sg(p.sign)}${esc(SIGNS[p.sign].name)}</td><td>${formatPos(p.lon, { withSign: false })}${p.retro ? ' ℞' : ''}</td><td>${['asc', 'mc'].includes(k) ? '' : ordinal(p.house)}</td></tr>`;
  }).join('');
  const bar = (list) => list.map(([k, v]) => `<span>${esc(k)}</span><div class="bar"><i style="width:${v * 10}%"></i></div><span>${v}</span>`).join('');
  return `
    ${n.timeUnknown ? '<div class="banner">Birth time unknown: Rising sign and angles are omitted, and houses use your Sun sign as the 1st house.</div>' : ''}
    <div class="card"><div class="eyebrow">Your signature</div><div class="big3">
      <p><b>${esc(port.sun)}</b></p><p><b>${esc(port.moon)}</b></p>${n.timeUnknown ? '' : `<p><b>${esc(port.rising)}</b></p>`}
      <p class="muted">${esc(port.dominant)} ${n.timeUnknown ? '' : esc(port.ruler)}</p></div></div>
    <div class="two"><div class="card"><div class="eyebrow">Elements</div><div class="elbars">${bar(port.elements)}</div></div>
    <div class="card"><div class="eyebrow">Modalities</div><div class="elbars">${bar(port.modalities)}</div></div></div>
    <h3 class="section-title">Positions</h3>
    <div class="card"><table><thead><tr><th>Body</th><th>Sign</th><th>Position</th><th>House</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${n.timeUnknown ? '' : `<h3 class="section-title">House cusps (Placidus)</h3>
    <div class="card"><table><thead><tr><th>House</th><th>Theme</th><th>Cusp</th></tr></thead><tbody>${HOUSES.map((h, i) => `<tr><td>${h.n}</td><td>${esc(h.label)}</td><td>${formatPos(n.cusps[i])}</td></tr>`).join('')}</tbody></table></div>`}`;
}

function renderPanel() {
  const view = { reading: readingView, transits: transitsView, forecast: forecastView, natal: natalView }[state.tab];
  $('#panel').innerHTML = view();
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === state.tab));
}

function renderTimebar() {
  $('#when').value = toLocalInput(state.when);
  const days = Math.round((state.when - state.now) / 86400000);
  $('#scrub').value = Math.max(-365, Math.min(365, days));
  $('#scrub-label').textContent = days === 0 ? 'today' : `${days > 0 ? '+' : ''}${days} days`;
}

function renderAll({ keepScroll = true } = {}) {
  const y = window.scrollY;
  renderWheelView();
  renderPanel();
  renderTimebar();
  if (keepScroll) window.scrollTo(0, y);
}

/* ---------- interactions ---------- */
function setWhen(d) {
  state.when = d;
  state.selected = null;
  renderAll();
}

function select(key, { switchTab = false } = {}) {
  state.selected = state.selected === key && !switchTab ? null : key;
  if (switchTab) state.tab = 'transits';
  renderAll();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-asp]');
  if (t) {
    const inWheel = !!t.closest('#wheel');
    select(t.dataset.asp, { switchTab: inWheel });
    if (inWheel) $('.right').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const tab = e.target.closest('.tab');
  if (tab) { state.tab = tab.dataset.tab; renderPanel(); return; }
  const f = e.target.closest('[data-filter]');
  if (f) { state.filters[f.dataset.filter] = !state.filters[f.dataset.filter]; renderPanel(); return; }
  const sh = e.target.closest('[data-shift]');
  if (sh) setWhen(new Date(state.when.getTime() + +sh.dataset.shift * 86400000));
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'fdays') { state.forecastDays = +e.target.value; renderPanel(); }
  if (e.target.id === 'when' && e.target.value) setWhen(new Date(e.target.value));
});
$('#scrub').addEventListener('input', (e) => setWhen(new Date(state.now.getTime() + +e.target.value * 86400000)));
$('#now').addEventListener('click', () => { state.now = new Date(); setWhen(new Date()); });

/* ---------- birth form ---------- */
const dlg = $('#birth-dialog');
const form = $('#birth-form');

function fillForm(p) {
  for (const [k, v] of Object.entries({ name: p.name, date: p.date, time: p.time, place: p.place, lat: p.lat, lon: p.lon, tz: p.tz })) form.elements[k].value = v ?? '';
  form.elements.timeUnknown.checked = !!p.timeUnknown;
  form.elements.time.disabled = !!p.timeUnknown;
}

function openForm() {
  $('#form-error').hidden = true;
  $('#place-results').innerHTML = '';
  fillForm(state.profile || { time: '12:00', tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  dlg.showModal();
}

form.elements.timeUnknown.addEventListener('change', (e) => { form.elements.time.disabled = e.target.checked; });
$('#cancel').addEventListener('click', () => dlg.close());
$('#example').addEventListener('click', () => fillForm(EXAMPLE));
$('#edit-birth').addEventListener('click', openForm);
$('#start').addEventListener('click', openForm);

async function lookup() {
  const q = form.elements.place.value.trim();
  const ul = $('#place-results');
  if (!q) return;
  ul.innerHTML = '<li class="muted">Searching…</li>';
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
    const data = await res.json();
    if (!data.results?.length) { ul.innerHTML = '<li class="muted">No matches. Try "City, Country" or enter coordinates below.</li>'; return; }
    ul.innerHTML = data.results.map((r, i) => `<li data-i="${i}">${esc(r.name)}${r.admin1 ? ', ' + esc(r.admin1) : ''}, ${esc(r.country || '')} <span class="hint">· ${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)} · ${esc(r.timezone)}</span></li>`).join('');
    ul.onclick = (ev) => {
      const li = ev.target.closest('li[data-i]');
      if (!li) return;
      const r = data.results[li.dataset.i];
      form.elements.place.value = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}, ${r.country || ''}`;
      form.elements.lat.value = r.latitude;
      form.elements.lon.value = r.longitude;
      form.elements.tz.value = r.timezone;
      ul.innerHTML = '';
    };
  } catch {
    ul.innerHTML = '<li class="muted">Lookup unavailable (offline?). Enter latitude, longitude and time zone manually.</li>';
  }
}
$('#lookup').addEventListener('click', lookup);
form.elements.place.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = form.elements;
  const err = $('#form-error');
  const profile = { name: f.name.value.trim(), date: f.date.value, time: f.time.value || '12:00', timeUnknown: f.timeUnknown.checked, place: f.place.value.trim(), lat: +f.lat.value, lon: +f.lon.value, tz: f.tz.value.trim() };
  const problem = !profile.date ? 'Enter a date of birth.'
    : !(profile.lat >= -90 && profile.lat <= 90) || !(profile.lon >= -180 && profile.lon <= 180) ? 'Latitude must be −90…90 and longitude −180…180.'
    : !isValidTimeZone(profile.tz) ? 'That time zone is not recognised. Use a name like America/New_York.' : '';
  if (problem) { err.textContent = problem; err.hidden = false; return; }
  dlg.close();
  loadProfile(profile, { save: true });
});

function loadProfile(profile, { save = false } = {}) {
  state.profile = profile;
  state.natal = computeNatal(profile);
  state.cache = {};
  state.selected = null;
  state.now = new Date();
  state.when = new Date();
  if (save) { try { localStorage.setItem(STORE_KEY, JSON.stringify(profile)); } catch { /* storage unavailable */ } }
  $('#empty').hidden = true;
  $('#main').hidden = false;
  renderProfile();
  renderAll({ keepScroll: false });
}

/* ---------- boot ---------- */
async function boot() {
  const tzs = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  $('#tzlist').innerHTML = tzs.map((t) => `<option value="${t}">`).join('');
  try {
    await initEphemeris();
  } catch (err) {
    $('#loading').innerHTML = `<div style="max-width:520px;text-align:center">Couldn't load the ephemeris.<br><small>${esc(err.message)}</small></div>`;
    throw err;
  }
  $('#loading').hidden = true;

  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { /* ignore */ }
  const params = new URLSearchParams(location.search);
  if (params.get('demo')) saved = EXAMPLE;
  if (params.get('tab')) state.tab = params.get('tab');
  if (saved) loadProfile(saved);
  else $('#empty').hidden = false;
  if (params.get('date')) setWhen(new Date(params.get('date')));
}
boot();
