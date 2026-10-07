import './style.css';
import { initEphemeris, dateToJd, jdToDate } from './astro/ephemeris.js';
import { natalFromBirth, buildChart, formatPos, houseOf, withSolarHouses, HOUSE_SYSTEMS } from './astro/chart.js';
import { transitAspects, synastryAspects } from './astro/aspects.js';
import { forecast, aspectPasses, outerAspects } from './astro/transits.js';
import { describeAspect, describeEvent, buildReading, skyToday, natalPortrait, natalLabel, ordinal, describeSynastry, compareSummary, setSubject, voice, possessive, isSelfVoice, houseInfo, placementLine } from './astro/interpret.js';
import { migrateKind } from './lib/charts-io.js';
import { initManage } from './ui/manage.js';
import { PLANETS, SIGNS, HOUSES, PLACEMENT_LINE } from './data/astro-data.js';
import { renderWheel } from './ui/wheel.js';
import { aspectKey, aspectsFor, sameSelection } from './ui/selection.js';
import { eventKind, firstSentence, groupEvents, activeFilterCount } from './lib/timeline.js';
import { validateStep, firstInvalidStep, STEP_TITLES } from './lib/form-steps.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const VS = '︎';
const STORE_KEY = 'transit-chart.profiles';
const LEGACY_KEY = 'transit-chart.profile';
const KIND_LABEL = { self: 'Me', person: 'Person', place: 'Country / place', event: 'Event / org' };
const KIND_HINT = {
  self: 'Your own chart. Readings speak to you directly ("you", "your").',
  person: 'Someone else. Readings use their name and "they", and advice is written about them.',
  place: 'For a country or place, use its founding moment. Readings refer to it by name, and many founding times are debated.',
  event: 'For an organization or event, use its start moment. Readings refer to it by name, and the exact time matters.',
};
const mq = window.matchMedia('(max-width: 760px)');
const isMobile = () => mq.matches;
const uid = () => Math.random().toString(36).slice(2, 9);

const EXAMPLE = { id: 'ex1', kind: 'person', name: 'Alex', date: '1990-07-04', time: '14:30', timeUnknown: false, place: 'New York, United States', lat: 40.7128, lon: -74.006, tz: 'America/New_York' };

const EXAMPLE2 = { id: 'ex2', kind: 'place', name: 'United States', date: '1776-07-04', time: '17:10', timeUnknown: false, place: 'Philadelphia, United States', lat: 39.9526, lon: -75.1652, tz: 'America/New_York' };

const state = {
  demo: false,
  profiles: [],
  activeId: null,
  compareId: '',
  profile: null,
  natal: null,
  now: new Date(),
  when: new Date(),
  tab: 'reading',
  renderToken: 0,
  selection: null,
  hadSaved: false,
  forecastAnchor: null,
  openEvents: new Set(),
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

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const selectedAspect = () => state.selection?.aspect ?? null;

const natalCache = new Map();
function natalOf(profile) {
  const key = JSON.stringify([profile.date, profile.time, profile.timeUnknown, profile.lat, profile.lon, profile.tz, profile.houseSystem]);
  if (!natalCache.has(key)) natalCache.set(key, Object.assign(computeNatal(profile), { _key: key }));
  return natalCache.get(key);
}

const nameOf = (p) => p.name || KIND_LABEL[p.kind] || 'Chart';
const adviceLabels = () => (isSelfVoice() ? { tip: 'Try', avoid: 'Mind' } : { tip: 'Suggestion', avoid: 'Gentle caution' });
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

const forecastCache = new Map();
const FORECAST_SPAN = 365;

/** Events from jd to jd+days. The full year is computed once per day/chart and sliced. */
function getForecast(jd, days) {
  const bucket = Math.floor(jd);
  const key = `${bucket}:${state.natal._key}`;
  let all = forecastCache.get(key);
  if (!all) {
    all = [...forecast(state.natal, bucket, bucket + FORECAST_SPAN), ...outerAspects(state.natal, bucket, bucket + FORECAST_SPAN)].sort((x, y) => x.jd - y.jd);
    if (state.natal.timeUnknown) all = all.filter((e) => !(e.type === 'aspect' && ['asc', 'mc'].includes(e.target)));
    forecastCache.set(key, all);
    if (forecastCache.size > 6) forecastCache.delete(forecastCache.keys().next().value);
  }
  const end = jd + days;
  return all.filter((e) => e.jd >= jd && e.jd <= end);
}

/* ---------- views ---------- */
function renderProfile() {
  const p = state.profile;
  const pts = state.natal.points;
  const rising = p.timeUnknown ? '' : ` · ↑ ${SIGNS[pts.asc.sign].name}`;
  const when = p.timeUnknown ? p.date : `${p.date} ${p.time}`;
  const label = { self: 'Born', person: 'Born', place: 'Founded', event: 'Started' }[p.kind] ?? 'Born';
  const el = $('#profile-summary');
  el.innerHTML = `<summary aria-label="Chart details for ${esc(nameOf(p))}"><span class="nm">${esc(nameOf(p))}</span><span class="big3">☉ ${SIGNS[pts.sun.sign].name} · ☽ ${SIGNS[pts.moon.sign].name}${rising}</span></summary>
    <div class="pdet">
      <div><b>${label}</b><span>${esc(when)}${p.timeUnknown ? ' (time unknown)' : ''}</span></div>
      <div><b>Place</b><span>${esc(p.place || `${(+p.lat).toFixed(2)}, ${(+p.lon).toFixed(2)}`)}</span></div>
      <div><b>Time zone</b><span>${esc(p.tz)}</span></div>
      <div><b>Houses</b><span>${esc(HOUSE_SYSTEMS[p.houseSystem ?? 'W'])}</span></div>
    </div>`;
  el.open = false;
}

// close the details popover when tapping elsewhere
document.addEventListener('click', (e) => {
  const d = $('#profile-summary');
  if (d?.open && !d.contains(e.target)) d.open = false;
});

function renderWheelView() {
  const cmp = isCompareView();
  $('.left').classList.toggle('compare', cmp);
  if (cmp) {
    const c = compareData();
    $('#wheel').innerHTML = renderWheel({ natal: c.A, transit: { points: c.B.points }, aspects: c.aspects, selection: state.selection, outerLabel: c.nameB, innerLabel: c.nameA, compact: isMobile() });
    $('#legend-outer').textContent = `Outer ring: ${c.nameB}`;
    $('#legend-inner').textContent = `Inner ring: ${c.nameA}`;
    return;
  }
  const { transit, aspects } = current();
  $('#wheel').innerHTML = renderWheel({ natal: state.natal, transit, aspects, selection: state.selection, compact: isMobile() });
  $('#legend-outer').textContent = 'Outer ring: transiting planets';
  $('#legend-inner').textContent = `Inner ring: ${possessive()} natal chart`;
}

/** The aspect list + selected card shown under the wheel on phones (a tappable alternative to thin lines). */
function aspectList(list, selectedKey, cmp) {
  const rows = list.slice(0, 8).map((a) => {
    const on = aspectKey(a) === selectedKey;
    const title = cmp ? `${PLANETS[a.transit].name} ${a.aspect} ${PLANETS[a.target].name}` : `${PLANETS[a.transit].name} ${a.aspect} ${natalLabel(a.target)}`;
    return `<li><button type="button" data-asp="${aspectKey(a)}" class="${on ? 'on' : ''}" aria-pressed="${on}"><i class="dot ${a.tone}"></i><span class="glyphs">${PLANETS[a.transit].glyph}${VS} ${a.glyph}${VS} ${PLANETS[a.target].glyph}${VS}</span><span class="t">${esc(title)}</span><span class="orb">${a.orb.toFixed(1)}°</span></button></li>`;
  }).join('');
  return rows ? `<h3 class="alist-title">Aspects right now</h3><ul class="arow">${rows}</ul>` : '';
}

/** Planet detail card: where it is, and every aspect it is part of (each row selects that aspect). */
function planetCard() {
  const { side, key } = state.selection.planet;
  const cmp = isCompareView();
  let list;
  let pts;
  let who;
  if (cmp) {
    const c = compareData();
    list = c.aspects;
    pts = side === 'natal' ? c.A.points : c.B.points;
    who = side === 'natal' ? c.nameA : c.nameB;
  } else {
    const cur = current();
    list = cur.aspects;
    pts = side === 'natal' ? state.natal.points : cur.transit.points;
    who = side === 'natal' ? possessive() : 'Transiting';
  }
  const p = pts[key];
  if (!p) return '';
  const rows = aspectsFor(list, { side, key });
  const house = !cmp || side === 'natal' ? ` · ${ordinal(p.house)} house` : '';
  const heading = `${who === 'your' ? 'Your' : who} ${PLANETS[key].name}`;
  const line = side === 'natal' && !cmp ? esc(voice(`${placementLine(key)}.`)) : `${esc(PLANETS[key].name)} stands for ${esc(PLANETS[key].principle)}.`;
  const items = rows.length
    ? `<ul class="arow">${rows.map((a) => `<li><button type="button" data-asp="${aspectKey(a)}"><i class="dot ${a.tone}"></i><span class="glyphs">${PLANETS[a.transit].glyph}${VS} ${a.glyph}${VS} ${PLANETS[a.target].glyph}${VS}</span><span class="t">${esc(side === 'natal' ? `${PLANETS[a.transit].name} ${a.aspect}` : `${a.aspect} ${PLANETS[a.target].name}`)}</span><span class="orb">${a.orb.toFixed(1)}°</span></button></li>`).join('')}</ul>`
    : '<p class="muted small" style="margin:8px 0 0">No tight aspects to this planet right now.</p>';
  return `<article class="card pcard">
    <h3>${g(key)}${esc(heading)}</h3>
    <p class="muted" style="margin:0 0 4px">${esc(SIGNS[p.sign].name)} ${Math.floor(p.degInSign)}°${p.retro ? ' ℞' : ''}${esc(house)}</p>
    <p style="margin:0">${line}</p>
    ${items}
  </article>`;
}

/** Whatever is selected, as a card (aspect or planet), or '' when nothing is. */
function selectionCard() {
  if (!state.selection) return '';
  const cmp = isCompareView();
  if (state.selection.planet) return planetCard();
  const list = cmp ? compareData().aspects : current().aspects;
  const a = list.find((x) => aspectKey(x) === state.selection.aspect);
  if (!a) return '';
  return cmp ? synCard(a, compareData()) : aspectCard(a, current().jd);
}

function renderWheelDetail() {
  const el = $('#wheel-detail');
  if (!isMobile()) { el.innerHTML = ''; return; }
  const cmp = isCompareView();
  const list = cmp ? compareData().aspects : current().aspects;
  const card = selectionCard();
  el.innerHTML = `${card || '<p class="hint">Tap a planet or a line on the wheel, or pick an aspect below.</p>'}${aspectList(list, selectedAspect(), cmp)}`;
}

function exactText(a, jd) {
  const passes = aspectPasses(a, jd);
  if (!passes.all.length) return '';
  const parts = passes.all.map((j) => `${fmtDateLong(j)}${j < jd ? ' (past)' : ''}`);
  return passes.all.length > 1 ? `Exact on ${parts.join(', ')}: ${passes.all.length} passes` : `Exact on ${parts[0]}`;
}

function aspectCard(a, jd, { withExact = true } = {}) {
  const d = describeAspect(a, state.natal);
  const sel = selectedAspect() === aspectKey(a);
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
    <div class="tipline"><b>${adviceLabels().tip}:</b> ${esc(d.tip)}</div>
    ${d.avoid ? `<div class="tipline avoid"><b>${adviceLabels().avoid}:</b> ${esc(d.avoid)}</div>` : ''}
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

function section(title, body, { open = true, id = '', count = '' } = {}) {
  return `<details class="sec" ${open ? 'open' : ''}${id ? ` id="${id}"` : ''}><summary>${title}${count ? `<span class="count">${esc(count)}</span>` : ''}</summary><div class="sec-body">${body}</div></details>`;
}

const CLIMATE_LABEL = { demanding: 'Demanding', mixed: 'Mixed', supportive: 'Supportive' };

/** One expandable transit: headline always visible, the full reading on demand. */
function txItem(a, { open = false, rank, brief = false } = {}) {
  const d = describeAspect(a, state.natal, brief ? undefined : rank);
  const key = aspectKey(a);
  const labels = adviceLabels();
  return `<details class="tx ${a.tone}" data-key="${key}" ${open ? 'open' : ''}>
    <summary>
      <span class="glyphs">${PLANETS[a.transit].glyph}${VS} ${a.glyph}${VS} ${PLANETS[a.target].glyph}${VS}</span>
      <span class="ttl">${esc(d.title)}</span>
      <span class="orbtag">${a.orb.toFixed(1)}° · ${esc(toneLabel[a.tone])}</span>
      <span class="tsum">${esc(firstSentence(d.text, 150))}</span>
    </summary>
    <div class="tx-body">
      <p>${esc(d.text)}</p>
      <div class="chips">
        <span class="chip t-${a.tone}">${toneLabel[a.tone]}</span>
        <span class="chip ${a.orb < 1 ? 'hot' : ''}">orb ${a.orb.toFixed(1)}°${a.orb < 1 ? ' · tight' : ''}</span>
        <span class="chip">${esc(d.timing)}</span>
        ${a.retro ? '<span class="chip">retrograde</span>' : ''}
      </div>
      ${brief ? '' : `<p class="muted small">${esc(d.pace)}</p>
      <div class="tipline"><b>${labels.tip}:</b> ${esc(d.tip)}</div>
      ${d.avoid ? `<div class="tipline avoid"><b>${labels.avoid}:</b> ${esc(d.avoid)}</div>` : ''}`}
      <p style="margin:12px 0 0"><button type="button" class="btn small" data-showchart="${key}">Show on chart</button></p>
    </div>
  </details>`;
}

/** Transit rows for the Reading. Advice and pace show once per planet, so three Neptune rows don't repeat themselves. */
function txList(top) {
  const seen = new Set();
  let shown = 0;
  return top.map((a, i) => {
    const brief = seen.has(a.transit);
    seen.add(a.transit);
    return txItem(a, { open: i === 0, rank: brief ? undefined : shown++, brief });
  });
}

function readingView() {
  const { jd, transit, aspects } = current();
  const mobile = isMobile();
  const reading = buildReading({ natal: state.natal, transit, aspects, events: [] });
  const sky = skyToday(state.natal, transit);
  const top = aspects.slice(0, mobile ? 3 : 4);
  const when = state.when.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const slots = '<p class="skeleton">Calculating…</p>';

  const eight = aspects.slice(0, 8);
  const hardN = eight.filter((a) => a.tone !== 'flowing').length;
  const best = aspects[0];
  const focus = reading.focusHouses.map((h) => `${ordinal(h)}: ${houseInfo(h).label}`);
  const tiles = [
    `<div class="tile t-${reading.climate === 'demanding' ? 'challenging' : reading.climate === 'supportive' ? 'flowing' : 'mixed'}"><span class="k">Climate</span><span class="v">${CLIMATE_LABEL[reading.climate]}</span><span class="s">${hardN} challenging · ${eight.length - hardN} flowing</span></div>`,
    best ? `<button type="button" class="tile" data-open-tx="${aspectKey(best)}"><span class="k">Strongest transit</span><span class="v">${esc(describeAspect(best, state.natal).title)}</span><span class="s">${best.orb.toFixed(1)}° from exact</span></button>` : '',
    `<div class="tile"><span class="k">Focus</span><span class="v">${esc(focus[0] || 'A quiet window')}</span><span class="s">${esc(focus[1] || '')}</span></div>`,
    `<div class="tile"><span class="k">Moon</span><span class="v">${esc(sky.phase)}</span><span class="s">in ${esc(sky.moonSign)} · ${ordinal(sky.moonHouse)} house</span></div>`,
    `<div class="tile"><span class="k">Retrograde</span><span class="v">${sky.retros.length ? esc(sky.retros.slice(0, 3).join(', ')) + (sky.retros.length > 3 ? ` +${sky.retros.length - 3}` : '') : 'None'}</span><span class="s">${sky.retros.length ? `${sky.retros.length} planet${sky.retros.length === 1 ? '' : 's'}` : 'All direct'}</span></div>`,
    `<div class="tile" id="tile-next"><span class="k">Coming up</span><span class="v">…</span><span class="s">Calculating</span></div>`,
  ].join('');

  return `
    ${state.natal.timeUnknown ? `<div class="banner">${esc(voice('Birth time unknown: houses are calculated from your Sun sign and angles (Asc/MC) are left out.'))}</div>` : ''}
    <section class="card lead">
      <div class="eyebrow">${esc(when)} · at a glance</div>
      <h2>${esc(reading.headline)}</h2>
      <div class="glance">${tiles}</div>
      <p class="lead-text">${esc(reading.climateText)} ${esc(reading.focusText)}</p>
    </section>

    ${section(esc(voice('Most important transits')), top.length ? txList(top).join('') + (aspects.length > top.length ? `<p class="muted small">${aspects.length - top.length} more in the Active transits tab.</p>` : '') : `<p class="muted">${esc(voice('No tight transits to your natal chart right now, a quiet window.'))}</p>`, { count: top.length ? `${aspects.length} active` : '' })}

    ${section('Do and mind', `<div class="two">
      <div class="card"><div class="eyebrow">Lean into</div><ul class="plain">${reading.tips.do.map((t) => `<li>${esc(t.text)}<span class="src">${esc(t.source)}</span></li>`).join('')}</ul></div>
      <div class="card"><div class="eyebrow">Watch out for</div><ul class="plain">${reading.tips.avoid.length ? reading.tips.avoid.map((t) => `<li>${esc(t.text)}<span class="src">${esc(t.source)}</span></li>`).join('') : '<li class="muted">Nothing pressing, and this is a good window to move forward.</li>'}</ul></div>
    </div>`, { open: !mobile })}

    ${section(esc(voice('The long game: slow planets in your houses')), reading.seasons.map((s) => `<div class="card"><h3>${esc(s.title)} · ${ordinal(s.house)} house</h3><p style="margin:0">${esc(s.text)}</p>${s.world ? `<p class="muted" style="margin:8px 0 0"><b>In the world:</b> ${esc(s.world)}</p>` : ''}</div>`).join(''), { open: false, count: `${reading.seasons.length} placements` })}

    ${section('The world calendar: next 12 months', `<div class="card" id="slot-world">${slots}</div>`, { open: false })}

    ${section("What's coming in the next 60 days", `<div class="card" id="slot-upcoming">${slots}</div>`, { open: false })}

    <p class="disclaimer">Astrology offers a framework for reflection. Read these as tendencies and timing, not fixed outcomes. For health, money or legal decisions, rely on qualified professionals.</p>`;
}

/** Fills the heavier, date-range sections after the first paint so the view appears instantly. */
function fillReadingLater(token) {
  setTimeout(() => {
    if (token !== state.renderToken || state.tab !== 'reading') return;
    const { jd, transit, aspects } = current();
    const events = getForecast(jd, 60);
    const reading = buildReading({ natal: state.natal, transit, aspects, events });
    const upcoming = reading.upcoming.filter((e) => e.type !== 'ingress' || SLOW.includes(e.transit) || e.transit === 'mars').slice(0, 10);
    const OUT = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
    const worldCal = getForecast(jd, 365).filter((e) => e.type === 'outer' || (e.type === 'lunation' && e.eclipse) || (e.type === 'ingress' && OUT.includes(e.transit)) || (e.type === 'station' && OUT.includes(e.transit))).slice(0, 12);
    // the "Coming up" tile
    const next = upcoming[0];
    const tile = $('#tile-next');
    if (tile) {
      if (next) {
        const d = describeEvent(next, state.natal);
        const when = jdToDate(next.jd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        tile.outerHTML = `<button type="button" class="tile" data-goto-forecast><span class="k">Coming up</span><span class="v">${esc(when)}</span><span class="s">${esc(d.title)}</span></button>`;
      } else tile.innerHTML = '<span class="k">Coming up</span><span class="v">Quiet</span><span class="s">Nothing major soon</span>';
    }
    // exact dates for the expanded transit cards
    for (const a of aspects.slice(0, isMobile() ? 3 : 4)) {
      const chips = document.querySelector(`#panel details.tx[data-key="${aspectKey(a)}"] .chips`);
      const text = chips && !chips.querySelector('.exact') ? exactText(a, jd) : '';
      if (text) chips.insertAdjacentHTML('beforeend', `<span class="chip hot exact">${esc(text)}</span>`);
    }
    const w = $('#slot-world');
    const u = $('#slot-upcoming');
    if (w) w.innerHTML = `${worldCal.length ? worldCal.map(eventRow).join('') : '<p class="muted">No major collective turning points ahead.</p>'}<p class="muted small" style="margin:12px 0 0">Collective themes are interpretive, a way to read the mood of an era rather than forecast specific headlines.</p>`;
    if (u) u.innerHTML = `${upcoming.length ? upcoming.map(eventRow).join('') : '<p class="muted">Nothing major on the calendar.</p>'}<p class="muted small" style="margin:12px 0 0">See the Forecast tab for the full calendar.</p>`;
  }, 30);
}

function transitsView() {
  const { jd, aspects } = current();
  const card = selectionCard();
  const rows = aspects.slice(0, 40).map((a) => {
    const max = aspects[0].strength;
    return `<tr class="row ${aspectKey(a) === selectedAspect() ? 'selected' : ''}" data-asp="${aspectKey(a)}" tabindex="0" aria-label="${esc(PLANETS[a.transit].name)} ${esc(a.aspect)} ${esc(natalLabel(a.target))}, orb ${a.orb.toFixed(2)} degrees">
      <td>${g(a.transit)}${esc(PLANETS[a.transit].name)}${a.retro ? ' ℞' : ''}</td>
      <td class="t-${a.tone}"><span class="g">${a.glyph}${VS}</span>${esc(a.aspect)}</td>
      <td>${g(a.target)}${esc(natalLabel(a.target).replace('natal ', ''))}</td>
      <td>${a.orb.toFixed(2)}°</td>
      <td class="m-hide">${a.applying ? 'applying' : 'separating'}</td>
      <td class="m-hide"><div class="bar"><i style="width:${Math.max(6, (a.strength / max) * 100)}%"></i></div></td>
    </tr>`;
  }).join('');
  return `
    ${card || '<p class="muted">Select a planet or a line on the wheel, or a row below, to read it in detail.</p>'}
    <div class="card"><table>
      <thead><tr><th>Transiting</th><th>Aspect</th><th>Natal</th><th>Orb</th><th class="m-hide">Phase</th><th class="m-hide">Weight</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="muted">No active aspects.</td></tr>'}</tbody>
    </table></div>`;
}

const FILTER_DEFAULTS = { aspect: true, station: true, ingress: true, lunation: true, outer: true, minor: false };
const FILTER_DEFS = [
  ['aspect', 'Transits', 'k-aspect'],
  ['station', 'Stations', 'k-station'],
  ['ingress', 'Sign changes', 'k-ingress'],
  ['lunation', 'Moons & eclipses', 'k-lunation'],
  ['outer', 'World cycles', 'k-outer'],
  ['minor', 'Minor fast-planet aspects', 'k-aspect'],
];
const filterChips = () => FILTER_DEFS.map(([k, label, kc]) => `<button type="button" class="chip ${kc}" data-filter="${k}" aria-pressed="${!!state.filters[k]}"><span class="swatch"></span>${label}</button>`).join('');

function fevRow(e) {
  const d = describeEvent(e, state.natal);
  const kind = eventKind(e);
  const when = jdToDate(e.jd);
  const id = `${e.type}-${Math.round(e.jd * 100)}-${e.transit ?? e.a ?? ''}-${e.aspect ?? e.phase ?? e.direction ?? ''}`;
  const asp = e.type === 'aspect' ? aspectKey({ transit: e.transit, aspect: e.aspect, target: e.target }) : '';
  return `<details class="fev k-${kind.key}${isBig(e) ? ' big' : ''}" data-ev="${esc(id)}" ${state.openEvents.has(id) ? 'open' : ''}>
    <summary>
      <div class="dt"><b>${when.getDate()}</b><span>${when.toLocaleDateString(undefined, { weekday: 'short' })}</span></div>
      <div class="main">
        <div class="ttl">${eventGlyph(e)} <span>${esc(d.title)}</span> <span class="kbadge"><i></i>${esc(kind.label)}</span></div>
        <div class="tsum">${esc(firstSentence(d.text, 170))}</div>
      </div>
    </summary>
    <div class="fev-body">
      <p>${esc(d.text)}</p>
      <button type="button" class="btn small" data-jump="${e.jd}" data-jump-asp="${esc(asp)}">Show on chart</button>
    </div>
  </details>`;
}

function forecastView() {
  const { jd } = current();
  const from = state.forecastAnchor ?? jd;
  const events = getForecast(from, state.forecastDays).filter((e) => state.filters[e.type] && (state.filters.minor || !isMinor(e)));
  const n = activeFilterCount(state.filters, FILTER_DEFAULTS);
  const anchored = state.forecastAnchor !== null && Math.abs(state.forecastAnchor - jd) > 1;
  const groups = groupEvents(events, from, state.forecastDays);
  let html = `<div class="filters hide-m" role="group" aria-label="Event types">${filterChips()}</div>
    <div class="fbar">
      <button type="button" id="open-filters" class="btn only-m">Filters${n ? ` (${n})` : ''}</button>
      <span class="spacer"></span>
      <select id="fdays" aria-label="How far ahead">${[30, 90, 180, 365].map((d) => `<option value="${d}" ${d === state.forecastDays ? 'selected' : ''}>Next ${d} days</option>`).join('')}</select>
    </div>
    ${anchored ? `<p class="muted small">Showing events from ${esc(jdToDate(from).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }))}. <button type="button" class="linkish" data-follow>Follow the chart date</button></p>` : ''}`;
  for (const g of groups) html += `<div class="fgroup-title">${esc(g.label)}</div>${g.items.map(fevRow).join('')}`;
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
    ${keys.map((k) => { const p = n.points[k]; const h = houseInfo(p.house); return `<div class="card place"><h3>${g(k)}${esc(PLANETS[k].name)} in ${esc(SIGNS[p.sign].name)}${p.retro && !['node', 'southnode'].includes(k) ? ' ℞' : ''} · ${ordinal(p.house)} house</h3><p class="muted" style="margin:2px 0 0">${esc(voice(`${placementLine(k)}, expressed through ${h.theme}.`))}</p></div>`; }).join('')}
    <details class="sec" ${isMobile() ? '' : 'open'}><summary>Positions</summary><div class="sec-body"><div class="card"><table><thead><tr><th>Body</th><th>Sign</th><th>Position</th><th>House</th></tr></thead><tbody>${rows}</tbody></table></div></div></details>
    ${n.timeUnknown ? '' : `<details class="sec" ${isMobile() ? '' : 'open'}><summary>House cusps (${HOUSE_SYSTEMS[n.houseSystem] ?? 'Placidus'})</summary><div class="sec-body"><div class="card"><table><thead><tr><th>House</th><th>Theme</th><th>Cusp</th></tr></thead><tbody>${HOUSES.map((h0, i) => { const h = houseInfo(h0.n); return `<tr><td>${h.n}</td><td>${esc(h.label)}</td><td>${formatPos(n.cusps[i])}</td></tr>`; }).join('')}</tbody></table></div></div></details>`}`;
}

function synCard(a, c, rank) {
  const d = describeSynastry(a, c.nameA, c.nameB, c.pa.kind, c.pb.kind, rank);
  const sel = selectedAspect() === aspectKey(a);
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
    return `<tr><td>${g(k)}${esc(PLANETS[k].name)}</td><td>${sg(Math.floor(lon / 30))}${esc(SIGNS[Math.floor(lon / 30)].name)}</td><td>${ordinal(h)} · ${esc(houseInfo(h).label)}</td></tr>`;
  }).join('');
  return `<div class="card"><div class="eyebrow">${esc(title)}</div><table><thead><tr><th>${esc(fromName)}</th><th>Sign</th><th>Lands in ${esc(toName)}'s house</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function compareView() {
  const c = compareData();
  const sum = compareSummary(c.aspects, c.nameA, c.nameB, c.pa.kind, c.pb.kind);
  const top = c.aspects.slice(0, 10);
  const li = (x) => `<li>${esc(x.title)}<span class="src">${esc(x.text)}</span></li>`;
  const unusual = ['place', 'event'].includes(c.pa.kind) || ['place', 'event'].includes(c.pb.kind);
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
    ${top.length ? top.map((a, i) => synCard(a, c, i)).join('') : '<p class="muted">No tight aspects between these charts.</p>'}
    <h3 class="section-title">House overlays</h3>
    ${overlayTable(`${c.nameB} in ${c.nameA}'s chart`, c.B, c.A, c.nameB, c.nameA)}
    ${overlayTable(`${c.nameA} in ${c.nameB}'s chart`, c.A, c.B, c.nameA, c.nameB)}
    <p class="disclaimer">Comparison charts show where two charts connect, not whether a relationship will succeed. Slow outer-planet pairs are left out because whole generations share them.</p>`;
}

function renderPanel() {
  if (state.tab === 'compare' && !compareProfile()) state.tab = 'reading';
  if (state.tab === 'wheel' && !isMobile()) state.tab = 'reading';
  document.body.dataset.tab = state.tab;
  const token = ++state.renderToken;
  if (state.tab === 'wheel') {
    $('#panel').innerHTML = '';
  } else {
    const view = { reading: readingView, transits: transitsView, forecast: forecastView, natal: natalView, compare: compareView }[state.tab];
    $('#panel').innerHTML = view();
    if (state.tab === 'reading') fillReadingLater(token);
  }
  document.querySelectorAll('.tab').forEach((t) => {
    const on = t.dataset.tab === state.tab;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1; // roving tabindex: arrow keys move between tabs
  });
  const active = document.querySelector('.tab.active');
  if (active) $('#panel').setAttribute('aria-labelledby', active.id);
}

function relativeDay(days) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

function renderTimebar() {
  const d = state.when;
  $('#when').value = toLocalInput(d);
  const days = Math.round((d - state.now) / 86400000);
  $('#scrub').value = Math.max(-365, Math.min(365, days));
  $('#scrub-label').textContent = days === 0 ? 'today' : `${days > 0 ? '+' : ''}${days} days`;
  $('#date-main').textContent = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  $('#date-sub').textContent = `${d.getFullYear()} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · ${relativeDay(days)}`;
}

function renderAll({ keepScroll = true } = {}) {
  const y = window.scrollY;
  renderWheelView();
  renderPanel();
  renderWheelDetail();
  renderTimebar();
  if (keepScroll) window.scrollTo(0, y);
}

/* ---------- interactions ---------- */
function setWhen(d) {
  state.when = d;
  state.forecastAnchor = null;
  state.selection = null;
  renderAll();
}

/** Show the card for a new selection: desktop moves to the Transits tab, phones keep the card under the wheel. */
function afterSelect({ fromWheel }) {
  if (fromWheel && !isCompareView() && !isMobile()) state.tab = 'transits';
  renderAll();
  if (!state.selection) return;
  const behavior = reduceMotion() ? 'auto' : 'smooth';
  if (isMobile() && $('.left').offsetParent) $('#wheel-detail').scrollIntoView({ block: 'nearest', behavior });
  else if (fromWheel && !isCompareView()) $('.right').scrollIntoView({ behavior, block: 'start' });
}

function selectAspect(key, { fromWheel = false } = {}) {
  const next = { aspect: key };
  state.selection = sameSelection(state.selection, next) ? null : next;
  afterSelect({ fromWheel });
}

function selectPlanet(side, key, { fromWheel = true } = {}) {
  const next = { planet: { side, key } };
  state.selection = sameSelection(state.selection, next) ? null : next;
  afterSelect({ fromWheel });
}

/** Move the chart to a forecast event's date (and select its aspect), keeping the forecast list where it was. */
function jumpTo(jd, aspKey) {
  state.forecastAnchor ??= current().jd;
  state.when = jdToDate(jd);
  state.selection = aspKey ? { aspect: aspKey } : null;
  if (isMobile()) state.tab = 'wheel';
  renderAll({ keepScroll: false });
  if (isMobile()) window.scrollTo(0, 0);
}

function refreshFilterDialog() {
  const dlg2 = $('#filter-dialog');
  if (!dlg2.open) return;
  $('#filter-body').innerHTML = `<div class="fgroup"><div class="eyebrow">Event types</div><div class="fchips">${filterChips()}</div></div>`;
}
$('#filter-close').addEventListener('click', () => $('#filter-dialog').close());
$('#filter-reset').addEventListener('click', () => { Object.assign(state.filters, FILTER_DEFAULTS); renderPanel(); refreshFilterDialog(); });
// remember which forecast events are expanded, so re-renders (e.g. after "Show on chart") keep them open
document.addEventListener('toggle', (e) => {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.dataset.ev) return;
  if (d.open) state.openEvents.add(d.dataset.ev); else state.openEvents.delete(d.dataset.ev);
}, true);

document.addEventListener('click', (e) => {
  const pl = e.target.closest('[data-pl]');
  if (pl) {
    const [side, key] = pl.dataset.pl.split(':');
    selectPlanet(side, key);
    return;
  }
  const t = e.target.closest('[data-asp]');
  if (t) { selectAspect(t.dataset.asp, { fromWheel: !!t.closest('#wheel') }); return; }
  const tab = e.target.closest('.tab');
  if (tab) { state.tab = tab.dataset.tab; state.selection = null; renderAll({ keepScroll: false }); if (isMobile()) window.scrollTo(0, 0); return; }
  const f = e.target.closest('[data-filter]');
  if (f) { state.filters[f.dataset.filter] = !state.filters[f.dataset.filter]; renderPanel(); refreshFilterDialog(); return; }
  const jump = e.target.closest('[data-jump]');
  if (jump) { jumpTo(+jump.dataset.jump, jump.dataset.jumpAsp); return; }
  if (e.target.closest('[data-follow]')) { state.forecastAnchor = null; renderPanel(); return; }
  if (e.target.closest('#open-filters')) { $('#filter-dialog').showModal(); refreshFilterDialog(); return; }
  const openTx = e.target.closest('[data-open-tx]');
  if (openTx) {
    const d = document.querySelector(`#panel details.tx[data-key="${openTx.dataset.openTx}"]`);
    if (d) { d.open = true; d.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' }); }
    return;
  }
  const show = e.target.closest('[data-showchart]');
  if (show) { state.selection = { aspect: show.dataset.showchart }; if (isMobile()) state.tab = 'wheel'; renderAll({ keepScroll: false }); window.scrollTo(0, 0); return; }
  if (e.target.closest('[data-goto-forecast]')) { state.tab = 'forecast'; state.selection = null; renderAll({ keepScroll: false }); window.scrollTo(0, 0); return; }
  const sh = e.target.closest('[data-shift]');
  if (sh) setWhen(new Date(state.when.getTime() + +sh.dataset.shift * 86400000));
});

document.querySelectorAll('.tab').forEach((t) => { t.id = `tab-${t.dataset.tab}`; t.setAttribute('aria-controls', 'panel'); });
document.querySelector('.tabs').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const tabs = [...document.querySelectorAll('.tab')].filter((t) => !t.hidden && t.offsetParent !== null);
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  e.preventDefault();
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus();
  tabs[next].click();
  tabs[next].focus();
});

// keyboard: SVG planets and lines act like buttons
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest?.('#wheel [role="button"], #landing-wheel[role="button"], tr.row[data-asp]');
  if (!el) return;
  e.preventDefault();
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'fdays') { state.forecastDays = +e.target.value; renderPanel(); }
  if (e.target.id === 'when' && e.target.value) setWhen(new Date(e.target.value));
});
let scrubTimer = null;
$('#scrub').addEventListener('input', (e) => {
  state.when = new Date(state.now.getTime() + +e.target.value * 86400000);
  state.forecastAnchor = null;
  state.selection = null;
  renderWheelView();
  renderTimebar();
  clearTimeout(scrubTimer);
  scrubTimer = setTimeout(() => { renderPanel(); renderWheelDetail(); }, 220);
});
$('#now').addEventListener('click', () => { state.now = new Date(); setWhen(new Date()); });

/* ---------- chart form (guided: date/time -> place -> review) ---------- */
const dlg = $('#birth-dialog');
const form = $('#birth-form');
const F = form.elements;

let editingId = null;
let step = 1;
let lastLookup = '';

const formValues = () => ({ date: F.date.value, time: F.time.value, timeUnknown: F.timeUnknown.checked, lat: F.lat.value, lon: F.lon.value, tz: F.tz.value.trim() });
const showError = (msg) => { const el = $('#form-error'); el.textContent = msg; el.hidden = !msg; };
const updateKindHint = () => { $('#kind-hint').textContent = KIND_HINT[F.kind.value] ?? ''; };

function reviewSummary() {
  const v = formValues();
  const when = v.date ? new Date(`${v.date}T${v.timeUnknown ? '12:00' : v.time || '12:00'}`) : null;
  $('#review-when').textContent = when && !Number.isNaN(+when)
    ? `${when.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}${v.timeUnknown ? ' · time unknown' : ` · ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}`
    : 'Not set';
  const coords = v.lat !== '' && v.lon !== '' ? `${(+v.lat).toFixed(2)}°, ${(+v.lon).toFixed(2)}°` : '';
  $('#review-where').textContent = [F.place.value.trim(), coords, v.tz].filter(Boolean).join(' · ') || 'Not set';
}

function showChosen() {
  const el = $('#place-chosen');
  const ok = F.lat.value !== '' && F.lon.value !== '' && F.tz.value;
  el.hidden = !ok;
  if (ok) el.textContent = `✓ ${F.place.value.trim() || 'Custom coordinates'} · ${(+F.lat.value).toFixed(2)}°, ${(+F.lon.value).toFixed(2)}° · ${F.tz.value}`;
}

function goStep(n, { focus = true } = {}) {
  step = Math.max(1, Math.min(3, n));
  document.querySelectorAll('#birth-form .step').forEach((sec) => { sec.hidden = +sec.dataset.step !== step; });
  document.querySelectorAll('#birth-form .stepbar i').forEach((dot, i) => dot.classList.toggle('on', i < step));
  $('#step-label').textContent = `${editingId ? 'Editing chart · ' : ''}Step ${step} of 3`;
  $('#form-title').textContent = STEP_TITLES[step];
  $('#step-back').hidden = step === 1;
  $('#step-next').hidden = step === 3;
  $('#step-done').hidden = step !== 3;
  $('#step-done').textContent = editingId ? 'Save changes' : 'Calculate';
  if (step === 3) reviewSummary();
  if (step === 2) showChosen();
  showError('');
  if (focus) {
    const target = { 1: F.date, 2: F.place, 3: F.name }[step];
    // don't pop the keyboard up on phones just for stepping through
    if (!isMobile() || step === 2) setTimeout(() => target?.focus(), 30);
  }
}

function fillForm(p) {
  F.kind.value = p.kind || 'person';
  for (const [k, v] of Object.entries({ name: p.name, date: p.date, time: p.time, place: p.place, lat: p.lat, lon: p.lon, tz: p.tz, houseSystem: p.houseSystem ?? 'W' })) F[k].value = v ?? '';
  F.timeUnknown.checked = !!p.timeUnknown;
  F.time.disabled = !!p.timeUnknown;
  lastLookup = p.place || '';
}

function openForm(mode = 'edit') {
  $('#place-results').innerHTML = '';
  $('#advanced').open = false;
  editingId = mode === 'edit' && state.profile ? state.profile.id : null;
  $('#delete-profile').hidden = !editingId;
  fillForm(editingId ? state.profile : { time: '12:00', tz: '', kind: state.profiles.length ? 'person' : 'self', name: '', date: '', place: '' });
  updateKindHint();
  goStep(editingId ? 3 : 1, { focus: false });
  dlg.showModal();
}

F.kind.addEventListener('change', updateKindHint);
F.timeUnknown.addEventListener('change', (e) => { F.time.disabled = e.target.checked; });
$('#cancel').addEventListener('click', () => dlg.close());
$('#edit-birth').addEventListener('click', () => openForm('edit'));
$('#add-profile').addEventListener('click', () => openForm('add'));
$('#start').addEventListener('click', () => openForm('add'));
$('#step-back').addEventListener('click', () => goStep(step - 1));
$('#step-next').addEventListener('click', () => {
  const problem = validateStep(step, formValues());
  if (problem) { showError(problem); return; }
  goStep(step + 1);
});
document.querySelectorAll('#birth-form [data-goto]').forEach((b) => b.addEventListener('click', () => goStep(+b.dataset.goto)));
$('#manual-coords').addEventListener('click', () => { $('#advanced').open = true; goStep(3); });
$('#delete-profile').addEventListener('click', () => {
  if (!editingId || !confirm('Delete this chart from this browser?')) return;
  state.profiles = state.profiles.filter((p) => p.id !== editingId);
  dlg.close();
  if (state.profiles.length) activate(state.profiles[0].id); else clearEverything();
});

// typing a new place invalidates the previously chosen coordinates
F.place.addEventListener('input', () => {
  if (F.place.value.trim() === lastLookup) return;
  F.lat.value = '';
  F.lon.value = '';
  F.tz.value = '';
  $('#place-chosen').hidden = true;
});

async function lookup() {
  const q = F.place.value.trim();
  const ul = $('#place-results');
  if (!q) { ul.innerHTML = '<li class="muted">Type a city first.</li>'; return; }
  ul.innerHTML = '<li class="muted">Searching…</li>';
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
    const data = await res.json();
    if (!data.results?.length) { ul.innerHTML = '<li class="muted">No matches. Try "City, Country", or enter coordinates manually.</li>'; return; }
    ul.innerHTML = data.results.map((r, i) => `<li data-i="${i}" role="button" tabindex="0">${esc(r.name)}${r.admin1 ? ', ' + esc(r.admin1) : ''}, ${esc(r.country || '')} <span class="hint">· ${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)} · ${esc(r.timezone)}</span></li>`).join('');
    const choose = (li) => {
      const r = data.results[li.dataset.i];
      F.place.value = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}, ${r.country || ''}`;
      lastLookup = F.place.value.trim();
      F.lat.value = r.latitude;
      F.lon.value = r.longitude;
      F.tz.value = r.timezone;
      ul.innerHTML = '';
      showChosen();
      showError('');
    };
    ul.onclick = (ev) => { const li = ev.target.closest('li[data-i]'); if (li) choose(li); };
    ul.onkeydown = (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { const li = ev.target.closest('li[data-i]'); if (li) { ev.preventDefault(); choose(li); } } };
  } catch {
    ul.innerHTML = '<li class="muted">Search unavailable (offline?). Use "Enter coordinates manually instead".</li>';
  }
}
$('#lookup').addEventListener('click', lookup);
F.place.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  // Enter on steps 1-2 means "next"; only the review step saves
  if (step < 3) { $('#step-next').click(); return; }
  const v = formValues();
  const bad = firstInvalidStep(v);
  if (bad) { goStep(bad, { focus: false }); showError(validateStep(bad, v)); return; }
  const profile = { id: editingId || uid(), kind: F.kind.value, name: F.name.value.trim(), date: v.date, time: v.timeUnknown ? '12:00' : v.time, timeUnknown: v.timeUnknown, place: F.place.value.trim(), lat: +v.lat, lon: +v.lon, tz: v.tz, houseSystem: F.houseSystem.value };
  dlg.close();
  if (state.demo) { state.demo = false; state.profiles = []; }
  const i = state.profiles.findIndex((p) => p.id === profile.id);
  if (i >= 0) state.profiles[i] = profile; else state.profiles.push(profile);
  activate(profile.id, { keepTab: true });
});

function saveStore() {
  if (state.demo) return; // demo links never touch saved charts
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ profiles: state.profiles, activeId: state.activeId, compareId: state.compareId })); } catch { /* storage unavailable */ }
}

function renderProfileControls() {
  const sel = $('#profile-select');
  sel.innerHTML = state.profiles.map((p) => `<option value="${p.id}" ${p.id === state.activeId ? 'selected' : ''}>${esc(nameOf(p))}</option>`).join('');
  const others = state.profiles.filter((p) => p.id !== state.activeId);
  if (!others.some((p) => p.id === state.compareId)) state.compareId = '';
  $('#compare-select').innerHTML = `<option value="">None</option>` + others.map((p) => `<option value="${p.id}" ${p.id === state.compareId ? 'selected' : ''}>${esc(nameOf(p))}</option>`).join('');
  $('.compare-switch').hidden = others.length === 0;
  $('.tab[data-tab="compare"]').hidden = !state.compareId;
  $('#menu-compare').innerHTML = $('#compare-select').innerHTML;
  $('#menu-compare-row').hidden = others.length === 0;
}

function activate(id, { keepTab = false } = {}) {
  state.activeId = id;
  state.profile = state.profiles.find((p) => p.id === id);
  setSubject(state.profile.name, state.profile.kind);
  state.natal = natalOf(state.profile);
  state.cache = {};
  state.forecastAnchor = null;
  state.selection = null;
  state.now = new Date();
  state.when = new Date();
  if (!keepTab && state.tab === 'compare') state.tab = 'reading';
  saveStore();
  $('#empty').hidden = true;
  $('#main').hidden = false;
  syncChrome();
  renderProfileControls();
  renderProfile();
  renderAll({ keepScroll: false });
}

/** Header/banner state that depends on whether a chart exists and whether we're in the example. */
function syncChrome() {
  document.body.classList.toggle('no-chart', !state.profile);
  document.body.classList.toggle('demo', state.demo && !!state.profile);
  const banner = $('#demo-banner');
  banner.hidden = !(state.demo && state.profile);
  $('#demo-exit').textContent = state.hadSaved ? 'Back to my charts' : 'Create my chart';
}

function clearStore() {
  for (const k of [STORE_KEY, LEGACY_KEY]) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } }
}

/** Replace the whole saved list (import / merge) and refresh the app around it. */
function applyProfiles(list) {
  state.profiles = list;
  natalCache.clear();
  forecastCache.clear();
  if (!list.length) { clearEverything(); return; }
  activate(list.some((p) => p.id === state.activeId) ? state.activeId : list[0].id, { keepTab: true });
}

/** Delete every saved chart in this browser and return to the first-visit state. */
function clearEverything() {
  state.profiles = [];
  state.activeId = null;
  state.compareId = '';
  state.tab = isMobile() ? 'wheel' : 'reading';
  natalCache.clear();
  forecastCache.clear();
  state.cache = {};
  clearStore();
  setSubject('', 'self');
  showEmpty();
}

const manage = initManage({
  getProfiles: () => state.profiles,
  applyProfiles,
  clearEverything,
  describe: (p) => ({ name: nameOf(p), sub: `${KIND_LABEL[p.kind] ?? 'Person'} · ${p.date}` }),
  newId: uid,
});
const menuDlg = $('#menu-dialog');
$('#manage-profiles').addEventListener('click', () => { if (isMobile()) menuDlg.showModal(); else manage.open(); });
$('#menu-close').addEventListener('click', () => menuDlg.close());
$('#menu-edit').addEventListener('click', () => { menuDlg.close(); openForm('edit'); });
$('#menu-add').addEventListener('click', () => { menuDlg.close(); openForm('add'); });
$('#menu-manage').addEventListener('click', () => { menuDlg.close(); manage.open(); });
$('#menu-compare').addEventListener('change', (e) => { menuDlg.close(); $('#compare-select').value = e.target.value; $('#compare-select').dispatchEvent(new Event('change')); });

function showEmpty() {
  state.profile = null;
  $('#main').hidden = true;
  $('#empty').hidden = false;
  $('#profile-summary').textContent = '';
  syncChrome();
  renderProfileControls();
  renderLanding();
}

/** The first-visit preview: a live example wheel for today. Tapping it opens the interactive example. */
function renderLanding() {
  try {
    const natal = natalOf(EXAMPLE);
    const transit = buildChart({ jd: dateToJd(new Date()), lat: natal.lat, lon: natal.lon });
    for (const p of Object.values(transit.points)) p.house = houseOf(p.lon, natal.cusps);
    $('#landing-wheel').innerHTML = renderWheel({ natal, transit, aspects: transitAspects(transit.points, natal.points), compact: isMobile(), outerLabel: 'Sky today', innerLabel: 'Example' });
  } catch { /* the preview is decoration; the buttons still work */ }
}

/** Explore the example without saving anything. */
function enterDemo() {
  state.demo = true;
  state.hadSaved = false;
  state.profiles = [EXAMPLE];
  state.compareId = '';
  state.tab = isMobile() ? 'wheel' : 'reading';
  activate(EXAMPLE.id, { keepTab: true });
  window.scrollTo(0, 0);
}

$('#explore-example').addEventListener('click', enterDemo);
$('#landing-wheel').addEventListener('click', enterDemo);
$('#landing-import').addEventListener('click', () => manage.openImport());
$('#demo-exit').addEventListener('click', () => {
  if (state.hadSaved) { location.href = location.pathname; return; }
  state.demo = false;
  state.profiles = [];
  state.activeId = null;
  natalCache.clear();
  showEmpty();
  openForm('add');
});

$('#profile-select').addEventListener('change', (e) => activate(e.target.value));
$('#compare-select').addEventListener('change', (e) => {
  state.compareId = e.target.value;
  state.tab = state.compareId ? 'compare' : 'reading';
  state.selection = null;
  saveStore();
  renderProfileControls();
  renderAll();
});

mq.addEventListener('change', () => {
  if (state.profile) renderAll({ keepScroll: false }); else renderLanding();
});

/* ---------- "What am I looking at?" ---------- */
function buildGuide() {
  const planets = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node']
    .map((k) => `<span><span class="g">${PLANETS[k].glyph}${VS}</span>${esc(PLANETS[k].name)}</span>`).join('');
  const signs = SIGNS.map((x) => `<span><span class="g">${x.glyph}${VS}</span>${esc(x.name)}</span>`).join('');
  return `
    <h3>The rings</h3>
    <ul>
      <li><b>Outer ring (gold):</b> where the planets are in the sky on the date you've chosen. These are the <i>transits</i>.</li>
      <li><b>Inner ring (white):</b> the chart itself, calculated for the moment of birth or founding. This is the <i>natal chart</i>.</li>
      <li><b>Coloured band:</b> the 12 zodiac signs. <b>Numbers 1–12:</b> the houses, or areas of life.</li>
    </ul>
    <h3>The lines</h3>
    <ul>
      <li><b style="color:var(--hard)">Red</b>: a challenging aspect (square or opposition), friction that asks for action.</li>
      <li><b style="color:var(--flow)">Teal</b>: a flowing aspect (trine or sextile), ease and opportunity.</li>
      <li><b style="color:var(--intense)">Purple</b>: a conjunction, two energies merging.</li>
      <li>Thicker lines are closer to exact.</li>
    </ul>
    <h3>Try it</h3>
    <ul>
      <li>Tap a planet to see everything touching it, or tap a line to read that one aspect. Everything unrelated fades.</li>
      <li>On a phone, the list under the wheel does the same thing with bigger targets.</li>
      <li>Move the date to watch the outer ring shift.</li>
    </ul>
    <h3>Symbols</h3>
    <div class="glossary">${planets}</div>
    <div class="glossary">${signs}</div>`;
}
$('#guide-btn').addEventListener('click', () => {
  $('#guide-body').innerHTML = buildGuide();
  $('#guide-dialog').showModal();
});
$('#guide-close').addEventListener('click', () => $('#guide-dialog').close());

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
  state.tab = params.get('tab') || (isMobile() ? 'wheel' : 'reading');
  if (isMobile()) state.forecastDays = 30;
  if (params.get('demo')) {
    state.demo = true;
    try { state.hadSaved = !!JSON.parse(localStorage.getItem(STORE_KEY) || 'null')?.profiles?.length; } catch { state.hadSaved = false; }
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
      state.profiles = store.profiles.map((p) => ({ ...p, kind: migrateKind(p) }));
      state.compareId = store.compareId || '';
      activate(state.profiles.some((p) => p.id === store.activeId) ? store.activeId : state.profiles[0].id, { keepTab: true });
    } else showEmpty();
  }
  if (params.get('date') && state.profile) setWhen(new Date(params.get('date')));
}
boot();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { /* offline cache is optional */ }));
}
