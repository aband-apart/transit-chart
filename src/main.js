import './style.css';
import { initEphemeris, dateToJd, jdToDate } from './astro/ephemeris.js';
import { natalFromBirth, buildChart, formatPos, houseOf, withSolarHouses, HOUSE_SYSTEMS } from './astro/chart.js';
import { transitAspects, synastryAspects } from './astro/aspects.js';
import { forecast, aspectPasses, outerAspects } from './astro/transits.js';
import { isValidTimeZone } from './astro/time.js';
import { describeAspect, describeEvent, buildReading, skyToday, natalPortrait, natalLabel, ordinal, describeSynastry, compareSummary, setSubject, voice, possessive } from './astro/interpret.js';
import { PLANETS, SIGNS, HOUSES, PLACEMENT_LINE } from './data/astro-data.js';
import { renderWheel } from './ui/wheel.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const VS = '︎';
const STORE_KEY = 'transit-chart.profiles';
const LEGACY_KEY = 'transit-chart.profile';
const KIND_LABEL = { person: 'Person', place: 'Country / place', event: 'Event / org' };
const uid = () => Math.random().toString(36).slice(2, 9);

const EXAMPLE = { id: 'ex1', kind: 'person', name: 'Example chart', date: '1990-07-04', time: '14:30', timeUnknown: false, place: 'New York, United States', lat: 40.7128, lon: -74.006, tz: 'America/New_York' };

const EXAMPLE2 = { id: 'ex2', kind: 'place', name: 'United States (example)', date: '1776-07-04', time: '17:10', timeUnknown: false, place: 'Philadelphia, United States', lat: 39.9526, lon: -75.1652, tz: 'America/New_York' };

const state = {
  profiles: [],
  activeId: null,
  compareId: '',
  profile: null,
  natal: null,
  now: new Date(),
  when: new Date(),
  tab: 'reading',
  selected: null,
  forecastDays: 90,
  filters: { aspect: true, station: true, ingress: true, lunation: true, outer: true, minor: false },
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
  let natal = natalFromBirth({ year, month, day, hour, minute, timeZone: profile.tz, lat: +profile.lat, lon: +profile.lon, houseSystem: profile.houseSystem ?? 'W' });
  if (profile.timeUnknown) natal = withSolarHouses(natal);
  natal.timeUnknown = !!profile.timeUnknown;
  return natal;
}

const natalCache = new Map();
function natalOf(profile) {
  const key = JSON.stringify([profile.date, profile.time, profile.timeUnknown, profile.lat, profile.lon, profile.tz, profile.houseSystem]);
  if (!natalCache.has(key)) natalCache.set(key, Object.assign(computeNatal(profile), { _key: key }));
  return natalCache.get(key);
}

const nameOf = (p) => p.name || KIND_LABEL[p.kind] || 'Chart';
const compareProfile = () => state.profiles.find((p) => p.id === state.compareId && p.id !== state.activeId) || null;
const isCompareView = () => state.tab === 'compare' && !!compareProfile();

function compareData() {
  const pb = compareProfile();
  const A = state.natal;
  const B = natalOf(pb);
  const skipA = A.timeUnknown ? ['asc', 'mc'] : [];
  const skipB = B.timeUnknown ? ['asc', 'mc'] : [];
  return { A, B, pa: state.profile, pb, nameA: nameOf(state.profile), nameB: nameOf(pb), aspects: synastryAspects(B.points, A.points, { skipKeysA: skipA, skipKeysB: skipB }) };
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
  state.cache.f ??= {};
  if (state.cache.f[key]) return state.cache.f[key];
  let events = [...forecast(state.natal, jd, jd + days), ...outerAspects(state.natal, jd, jd + days)].sort((a, b) => a.jd - b.jd);
  if (state.natal.timeUnknown) events = events.filter((e) => !(e.type === 'aspect' && ['asc', 'mc'].includes(e.target)));
  state.cache.f[key] = events;
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
  const cmp = isCompareView();
  $('.left').classList.toggle('compare', cmp);
  if (cmp) {
    const c = compareData();
    $('#wheel').innerHTML = renderWheel({ natal: c.A, transit: { points: c.B.points }, aspects: c.aspects, selected: state.selected, outerLabel: c.nameB, innerLabel: c.nameA });
    $('#legend-outer').textContent = `Outer ring: ${c.nameB}`;
    $('#legend-inner').textContent = `Inner ring: ${c.nameA}`;
    return;
  }
  const { transit, aspects } = current();
  $('#wheel').innerHTML = renderWheel({ natal: state.natal, transit, aspects, selected: state.selected });
  $('#legend-outer').textContent = 'Outer ring: transiting planets';
  $('#legend-inner').textContent = `Inner ring: ${possessive()} natal chart`;
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
  if (e.type === 'outer') return `${g(e.a)}<span class="g">${e.glyph}${VS}</span>${g(e.b)}`;
  if (e.type === 'lunation') return `<span class="g">${e.eclipse ? '◉' : e.phase === 'new' ? '●' : '○'}</span>${sg(e.sign)}`;
  return '';
}
const SLOW = ['saturn', 'jupiter', 'uranus', 'neptune', 'pluto', 'chiron'];
const isMinor = (e) => e.type === 'aspect' && ['sun', 'mercury', 'venus', 'mars'].includes(e.transit) && !['sun', 'moon', 'asc', 'mc'].includes(e.target);
const isBig = (e) => e.type === 'outer' || e.eclipse || (SLOW.includes(e.transit) && e.type !== 'ingress') || (e.type === 'ingress' && SLOW.includes(e.transit));

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
  const OUT = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const worldCal = getForecast(jd, 365).filter((e) => e.type === 'outer' || (e.type === 'lunation' && e.eclipse) || (e.type === 'ingress' && OUT.includes(e.transit)) || (e.type === 'station' && OUT.includes(e.transit))).slice(0, 12);
  const when = state.when.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return `
    ${state.natal.timeUnknown ? `<div class="banner">${esc(voice('Birth time unknown: houses are calculated from your Sun sign and angles (Asc/MC) are left out.'))}</div>` : ''}
    <section class="card lead">
      <div class="eyebrow">${esc(when)}</div>
      <h2>${esc(reading.headline)}</h2>
      <p>${esc(reading.climateText)} ${esc(reading.focusText)}</p>
      <div class="sky">
        <span><b>${esc(sky.phase)}</b> in ${esc(sky.moonSign)}</span>
        <span>Moon in ${esc(possessive())} <b>${ordinal(sky.moonHouse)} house</b></span>
        <span>Sun in <b>${esc(sky.sunSign)}</b></span>
        ${sky.retros.length ? `<span>Retrograde: <b>${esc(sky.retros.join(', '))}</b></span>` : '<span>No planets retrograde</span>'}
      </div>
    </section>

    <h3 class="section-title">${esc(voice("What's touching your chart"))}</h3>
    ${top.length ? top.map((a) => aspectCard(a, jd)).join('') : `<p class="muted">${esc(voice('No tight transits to your natal chart right now, a quiet window.'))}</p>`}

    <h3 class="section-title">Do and mind</h3>
    <div class="two">
      <div class="card"><div class="eyebrow">Lean into</div><ul class="plain">${reading.tips.do.map((t) => `<li>${esc(t.text)}<span class="src">${esc(t.source)}</span></li>`).join('')}</ul></div>
      <div class="card"><div class="eyebrow">Watch out for</div><ul class="plain">${reading.tips.avoid.length ? reading.tips.avoid.map((t) => `<li>${esc(t.text)}<span class="src">${esc(t.source)}</span></li>`).join('') : '<li class="muted">Nothing pressing, and this is a good window to move forward.</li>'}</ul></div>
    </div>

    <h3 class="section-title">${esc(voice('The long game: slow planets in your houses'))}</h3>
    ${reading.seasons.map((s) => `<div class="card"><h3>${esc(s.title)} · ${ordinal(s.house)} house</h3><p style="margin:0">${esc(s.text)}</p>${s.world ? `<p class="muted" style="margin:8px 0 0"><b>In the world:</b> ${esc(s.world)}</p>` : ''}</div>`).join('')}

    <h3 class="section-title">The world calendar: next 12 months</h3>
    <div class="card">${worldCal.length ? worldCal.map(eventRow).join('') : '<p class="muted">No major collective turning points ahead.</p>'}
    <p class="muted small" style="margin:12px 0 0">Collective themes are interpretive, a way to read the mood of an era rather than forecast specific headlines.</p></div>

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
  const chips = [['aspect', 'Exact aspects'], ['station', 'Stations'], ['ingress', 'Sign changes'], ['lunation', 'New & full moons'], ['outer', 'World cycles'], ['minor', 'Minor fast-planet aspects']]
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
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node', 'southnode', 'lilith', 'pallas'];
  if (!n.timeUnknown) keys.push('asc', 'mc', 'ic', 'dsc');
  const missing = keys.filter((k) => !n.points[k]);
  keys.splice(0, keys.length, ...keys.filter((k) => n.points[k]));
  const rows = keys.map((k) => {
    const p = n.points[k];
    return `<tr><td>${g(k)}${esc(PLANETS[k].name)}</td><td>${sg(p.sign)}${esc(SIGNS[p.sign].name)}</td><td>${formatPos(p.lon, { withSign: false })}${p.retro ? ' ℞' : ''}</td><td>${ordinal(p.house)}</td></tr>`;
  }).join('');
  const bar = (list) => list.map(([k, v]) => `<span>${esc(k)}</span><div class="bar"><i style="width:${v * 10}%"></i></div><span>${v}</span>`).join('');
  return `
    ${n.timeUnknown ? `<div class="banner">${esc(voice('Birth time unknown: Rising sign and angles are omitted, and houses use your Sun sign as the 1st house.'))}</div>` : ''}
    ${missing.length ? `<div class="banner">${missing.map((k) => PLANETS[k].name).join(' and ')} can't be calculated for this date (the bundled asteroid data does not reach this far back).</div>` : ''}
    <div class="card"><div class="eyebrow">${esc(voice('Your signature'))}</div><div class="big3">
      <p><b>${esc(port.sun)}</b></p><p><b>${esc(port.moon)}</b></p>${n.timeUnknown ? '' : `<p><b>${esc(port.rising)}</b></p>`}
      <p class="muted">${esc(port.dominant)} ${n.timeUnknown ? '' : esc(port.ruler)}</p></div></div>
    <div class="two"><div class="card"><div class="eyebrow">Elements</div><div class="elbars">${bar(port.elements)}</div></div>
    <div class="card"><div class="eyebrow">Modalities</div><div class="elbars">${bar(port.modalities)}</div></div></div>
    <h3 class="section-title">${esc(voice('Your placements'))}</h3>
    ${keys.map((k) => { const p = n.points[k]; const h = HOUSES[p.house - 1]; return `<div class="card place"><h3>${g(k)}${esc(PLANETS[k].name)} in ${esc(SIGNS[p.sign].name)}${p.retro && !['node', 'southnode'].includes(k) ? ' ℞' : ''} · ${ordinal(p.house)} house</h3><p class="muted" style="margin:2px 0 0">${esc(voice(`${PLACEMENT_LINE[k]}, expressed through ${h.theme}.`))}</p></div>`; }).join('')}
    <h3 class="section-title">Positions</h3>
    <div class="card"><table><thead><tr><th>Body</th><th>Sign</th><th>Position</th><th>House</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${n.timeUnknown ? '' : `<h3 class="section-title">House cusps (${HOUSE_SYSTEMS[n.houseSystem] ?? 'Placidus'})</h3>
    <div class="card"><table><thead><tr><th>House</th><th>Theme</th><th>Cusp</th></tr></thead><tbody>${HOUSES.map((h, i) => `<tr><td>${h.n}</td><td>${esc(h.label)}</td><td>${formatPos(n.cusps[i])}</td></tr>`).join('')}</tbody></table></div>`}`;
}

function synCard(a, c) {
  const d = describeSynastry(a, c.nameA, c.nameB);
  const sel = state.selected === aspectKey(a);
  return `<article class="card tcard ${a.tone}${sel ? ' selected' : ''}" data-asp="${aspectKey(a)}">
    <header><span class="glyphs">${PLANETS[a.transit].glyph}${VS} ${a.glyph}${VS} ${PLANETS[a.target].glyph}${VS}</span><h3>${esc(d.title)}</h3></header>
    <p>${esc(d.text)}</p>
    <div class="chips"><span class="chip t-${a.tone}">${toneLabel[a.tone]}</span><span class="chip ${a.orb < 1 ? 'hot' : ''}">orb ${a.orb.toFixed(1)}°${a.orb < 1 ? ' · tight' : ''}</span></div>
  </article>`;
}

function overlayTable(title, from, to, fromName, toName) {
  const keys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node'];
  const rows = keys.filter((k) => from.points[k]).map((k) => {
    const lon = from.points[k].lon;
    const h = houseOf(lon, to.cusps);
    return `<tr><td>${g(k)}${esc(PLANETS[k].name)}</td><td>${sg(Math.floor(lon / 30))}${esc(SIGNS[Math.floor(lon / 30)].name)}</td><td>${ordinal(h)} · ${esc(HOUSES[h - 1].label)}</td></tr>`;
  }).join('');
  return `<div class="card"><div class="eyebrow">${esc(title)}</div><table><thead><tr><th>${esc(fromName)}</th><th>Sign</th><th>Lands in ${esc(toName)}'s house</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function compareView() {
  const c = compareData();
  const sum = compareSummary(c.aspects, c.nameA, c.nameB);
  const top = c.aspects.slice(0, 10);
  const li = (x) => `<li>${esc(x.title)}<span class="src">${esc(x.text)}</span></li>`;
  const unusual = c.pa.kind !== 'person' || c.pb.kind !== 'person';
  return `
    ${c.A.timeUnknown || c.B.timeUnknown ? '<div class="banner">One chart has no birth time, so Ascendant and Midheaven contacts are left out, and house overlays use Sun-sign houses.</div>' : ''}
    <section class="card lead">
      <div class="eyebrow"><span class="who a">${esc(c.nameA)}</span> inner &nbsp; <span class="who b">${esc(c.nameB)}</span> outer</div>
      <h2>${esc(c.nameA)} & ${esc(c.nameB)}: a ${esc(sum.climate)} connection</h2>
      <p>${esc(sum.climateText)}</p>
      ${sum.themes.length ? `<ul class="plain">${sum.themes.map((t) => `<li class="t-${t.tone}">${esc(t.text)}</li>`).join('')}</ul>` : '<p class="muted">No standout personal-planet links, so this is a quieter connection.</p>'}
      ${unusual ? '<p class="muted small" style="margin-top:10px">Charts for countries, organizations and events depend on the chosen founding moment, which is often debated. Treat the result as one lens.</p>' : ''}
    </section>
    <div class="two">
      <div class="card"><div class="eyebrow">Where it flows</div><ul class="plain">${sum.strengths.length ? sum.strengths.map(li).join('') : '<li class="muted">No major easy links.</li>'}</ul></div>
      <div class="card"><div class="eyebrow">Where it rubs</div><ul class="plain">${sum.frictions.length ? sum.frictions.map(li).join('') : '<li class="muted">No major friction.</li>'}</ul></div>
    </div>
    <h3 class="section-title">Strongest links</h3>
    ${top.length ? top.map((a) => synCard(a, c)).join('') : '<p class="muted">No tight aspects between these charts.</p>'}
    <h3 class="section-title">House overlays</h3>
    ${overlayTable(`${c.nameB} in ${c.nameA}'s chart`, c.B, c.A, c.nameB, c.nameA)}
    ${overlayTable(`${c.nameA} in ${c.nameB}'s chart`, c.A, c.B, c.nameA, c.nameB)}
    <p class="disclaimer">Comparison charts show where two charts connect, not whether a relationship will succeed. Slow outer-planet pairs are left out because whole generations share them.</p>`;
}

function renderPanel() {
  if (state.tab === 'compare' && !compareProfile()) state.tab = 'reading';
  const view = { reading: readingView, transits: transitsView, forecast: forecastView, natal: natalView, compare: compareView }[state.tab];
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
  if (switchTab && !isCompareView()) state.tab = 'transits';
  renderAll();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-asp]');
  if (t) {
    const inWheel = !!t.closest('#wheel');
    select(t.dataset.asp, { switchTab: inWheel });
    if (inWheel && !isCompareView()) $('.right').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const tab = e.target.closest('.tab');
  if (tab) { state.tab = tab.dataset.tab; state.selected = null; renderAll(); return; }
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

let editingId = null;

function fillForm(p) {
  form.elements.kind.value = p.kind || 'person';
  for (const [k, v] of Object.entries({ name: p.name, date: p.date, time: p.time, place: p.place, lat: p.lat, lon: p.lon, tz: p.tz, houseSystem: p.houseSystem ?? 'W' })) form.elements[k].value = v ?? '';
  form.elements.timeUnknown.checked = !!p.timeUnknown;
  form.elements.time.disabled = !!p.timeUnknown;
}

function openForm(mode = 'edit') {
  $('#form-error').hidden = true;
  $('#place-results').innerHTML = '';
  editingId = mode === 'edit' && state.profile ? state.profile.id : null;
  $('#form-title').textContent = editingId ? 'Edit chart' : state.profiles.length ? 'Add a chart' : 'Birth details';
  $('#delete-profile').hidden = !editingId;
  fillForm(editingId ? state.profile : { time: '12:00', tz: Intl.DateTimeFormat().resolvedOptions().timeZone, kind: state.profiles.length ? 'person' : 'person' });
  dlg.showModal();
}

form.elements.timeUnknown.addEventListener('change', (e) => { form.elements.time.disabled = e.target.checked; });
$('#cancel').addEventListener('click', () => dlg.close());
$('#example').addEventListener('click', () => fillForm(EXAMPLE));
$('#edit-birth').addEventListener('click', () => openForm('edit'));
$('#add-profile').addEventListener('click', () => openForm('add'));
$('#start').addEventListener('click', () => openForm('add'));
$('#delete-profile').addEventListener('click', () => {
  if (!editingId || !confirm('Delete this chart from this browser?')) return;
  state.profiles = state.profiles.filter((p) => p.id !== editingId);
  dlg.close();
  if (state.profiles.length) activate(state.profiles[0].id); else { state.activeId = null; saveStore(); showEmpty(); }
});

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
  const profile = { id: editingId || uid(), kind: f.kind.value, name: f.name.value.trim(), date: f.date.value, time: f.time.value || '12:00', timeUnknown: f.timeUnknown.checked, place: f.place.value.trim(), lat: +f.lat.value, lon: +f.lon.value, tz: f.tz.value.trim(), houseSystem: f.houseSystem.value };
  const problem = !profile.date ? 'Enter a date of birth.'
    : !(profile.lat >= -90 && profile.lat <= 90) || !(profile.lon >= -180 && profile.lon <= 180) ? 'Latitude must be −90…90 and longitude −180…180.'
    : !isValidTimeZone(profile.tz) ? 'That time zone is not recognised. Use a name like America/New_York.' : '';
  if (problem) { err.textContent = problem; err.hidden = false; return; }
  dlg.close();
  const i = state.profiles.findIndex((p) => p.id === profile.id);
  if (i >= 0) state.profiles[i] = profile; else state.profiles.push(profile);
  activate(profile.id, { keepTab: true });
});

function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ profiles: state.profiles, activeId: state.activeId, compareId: state.compareId })); } catch { /* storage unavailable */ }
}

function renderProfileControls() {
  const sel = $('#profile-select');
  sel.innerHTML = state.profiles.map((p) => `<option value="${p.id}" ${p.id === state.activeId ? 'selected' : ''}>${esc(nameOf(p))}</option>`).join('');
  const others = state.profiles.filter((p) => p.id !== state.activeId);
  if (!others.some((p) => p.id === state.compareId)) state.compareId = '';
  $('#compare-select').innerHTML = `<option value="">None</option>` + others.map((p) => `<option value="${p.id}" ${p.id === state.compareId ? 'selected' : ''}>${esc(nameOf(p))}</option>`).join('');
  $('.compare-switch').hidden = others.length === 0;
  $('#compare-tab').hidden = !state.compareId;
}

function activate(id, { keepTab = false } = {}) {
  state.activeId = id;
  state.profile = state.profiles.find((p) => p.id === id);
  setSubject(state.profile.name || (state.profile.kind === 'person' ? '' : 'this chart'));
  state.natal = natalOf(state.profile);
  state.cache = {};
  state.selected = null;
  state.now = new Date();
  state.when = new Date();
  if (!keepTab && state.tab === 'compare') state.tab = 'reading';
  saveStore();
  $('#empty').hidden = true;
  $('#main').hidden = false;
  renderProfileControls();
  renderProfile();
  renderAll({ keepScroll: false });
}

function showEmpty() {
  state.profile = null;
  $('#main').hidden = true;
  $('#empty').hidden = false;
  $('#profile-summary').textContent = '';
  renderProfileControls();
}

$('#profile-select').addEventListener('change', (e) => activate(e.target.value));
$('#compare-select').addEventListener('change', (e) => {
  state.compareId = e.target.value;
  state.tab = state.compareId ? 'compare' : 'reading';
  state.selected = null;
  saveStore();
  renderProfileControls();
  renderAll();
});

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

  const params = new URLSearchParams(location.search);
  if (params.get('tab')) state.tab = params.get('tab');
  if (params.get('demo')) {
    state.profiles = params.get('demo') === '2' ? [EXAMPLE, EXAMPLE2] : [EXAMPLE];
    if (params.get('demo') === '2') state.compareId = EXAMPLE2.id;
    activate(EXAMPLE.id, { keepTab: true });
  } else {
    let store = null;
    try {
      store = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!store) {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
        if (legacy) store = { profiles: [{ ...legacy, id: uid(), kind: 'person' }] };
      }
    } catch { /* ignore */ }
    if (store?.profiles?.length) {
      state.profiles = store.profiles;
      state.compareId = store.compareId || '';
      activate(state.profiles.some((p) => p.id === store.activeId) ? store.activeId : state.profiles[0].id, { keepTab: true });
    } else showEmpty();
  }
  if (params.get('date') && state.profile) setWhen(new Date(params.get('date')));
}
boot();
