import { SIGNS, PLANETS } from '../data/astro-data.js';
import { norm360 } from '../astro/ephemeris.js';

const C = 380; // center
const R = {
  frame: 372,
  transitGlyph: 350,
  transitDeg: 331,
  zodiacOuter: 318,
  zodiacInner: 280,
  zodiacGlyph: 299,
  natalGlyph: 252,
  natalDeg: 232,
  houseOuter: 280,
  houseInner: 188,
  houseNum: 174,
  aspect: 160,
};

const ELEMENT_COLOR = { Fire: '#ff8a65', Earth: '#9ccc65', Air: '#4dd0e1', Water: '#9fa8ff' };
const VS = '︎'; // force text (not emoji) presentation

const NATAL_SHOWN = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node'];
const TRANSIT_SHOWN = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node'];

/** screen point for an ecliptic longitude. ASC sits at 9 o'clock, zodiac runs counter-clockwise. */
function pt(lon, r, asc) {
  const th = Math.PI + ((norm360(lon - asc)) * Math.PI) / 180;
  return [C + r * Math.cos(th), C - r * Math.sin(th)];
}

/** Push crowded glyphs apart so they stay readable. Returns display longitudes. */
function declutter(items, minSep) {
  const arr = items.map((it) => ({ ...it, disp: it.lon })).sort((a, b) => a.lon - b.lon);
  const n = arr.length;
  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (let i = 0; i < n; i++) {
      const a = arr[i];
      const b = arr[(i + 1) % n];
      let gap = norm360(b.disp - a.disp);
      if (n > 1 && gap < minSep) {
        const push = (minSep - gap) / 2 + 0.01;
        a.disp = norm360(a.disp - push);
        b.disp = norm360(b.disp + push);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return arr;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function renderWheel({ natal, transit, aspects, selected }) {
  const asc = natal.asc;
  let svg = `<svg viewBox="-28 -28 816 816" class="wheel" role="img" aria-label="Natal chart with transiting planets">`;
  svg += `<defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="var(--wheel-core)"/><stop offset="100%" stop-color="var(--wheel-edge)"/></radialGradient>
  </defs>`;
  svg += `<circle cx="${C}" cy="${C}" r="${R.frame}" fill="url(#bg)" class="w-frame"/>`;

  // transit band outline
  svg += `<circle cx="${C}" cy="${C}" r="${R.zodiacOuter}" class="w-line"/>`;

  // zodiac ring (30° segments)
  for (let i = 0; i < 12; i++) {
    const s = SIGNS[i];
    const a0 = i * 30;
    const a1 = (i + 1) * 30;
    const p0o = pt(a0, R.zodiacOuter, asc);
    const p1o = pt(a1, R.zodiacOuter, asc);
    const p0i = pt(a0, R.zodiacInner, asc);
    const p1i = pt(a1, R.zodiacInner, asc);
    svg += `<path d="M${p0o} A${R.zodiacOuter} ${R.zodiacOuter} 0 0 0 ${p1o} L${p1i} A${R.zodiacInner} ${R.zodiacInner} 0 0 1 ${p0i} Z" fill="${ELEMENT_COLOR[s.element]}" fill-opacity="0.14" class="w-line"/>`;
    const [gx, gy] = pt(a0 + 15, R.zodiacGlyph, asc);
    svg += `<text x="${gx}" y="${gy}" class="w-sign" fill="${ELEMENT_COLOR[s.element]}" text-anchor="middle" dominant-baseline="central"><title>${s.name}</title>${s.glyph}${VS}</text>`;
    // 10° ticks
    for (const d of [10, 20]) {
      const [x1, y1] = pt(a0 + d, R.zodiacInner, asc);
      const [x2, y2] = pt(a0 + d, R.zodiacInner + 6, asc);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="w-tick"/>`;
    }
  }
  svg += `<circle cx="${C}" cy="${C}" r="${R.zodiacInner}" class="w-line"/>`;

  // houses
  const cusps = natal.cusps;
  for (let i = 0; i < 12; i++) {
    const c = cusps[i];
    const axis = i === 0 || i === 3 || i === 6 || i === 9;
    const [x1, y1] = pt(c, R.houseOuter, asc);
    const [x2, y2] = pt(c, R.houseInner, asc);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${axis ? 'w-axis' : 'w-house'}"/>`;
    const next = cusps[(i + 1) % 12];
    const mid = norm360(c + norm360(next - c) / 2);
    const [nx, ny] = pt(mid, R.houseNum, asc);
    svg += `<text x="${nx}" y="${ny}" class="w-hnum" text-anchor="middle" dominant-baseline="central">${i + 1}</text>`;
  }
  svg += `<circle cx="${C}" cy="${C}" r="${R.houseInner}" class="w-line"/>`;
  svg += `<circle cx="${C}" cy="${C}" r="${R.aspect}" class="w-line w-core"/>`;

  // axis labels
  for (const [k, lon, label] of natal.timeUnknown ? [] : [['asc', natal.asc, 'ASC'], ['mc', natal.mc, 'MC']]) {
    const [x, y] = pt(lon, R.zodiacOuter + 0, asc);
    const [lx, ly] = pt(lon, R.frame + 14, asc);
    svg += `<text x="${lx}" y="${ly}" class="w-axis-label" text-anchor="middle" dominant-baseline="central">${label}</text>`;
  }

  // aspect lines (transit -> natal), drawn under the planets
  const shown = aspects.filter((a) => NATAL_SHOWN.concat(['asc', 'mc']).includes(a.target) && TRANSIT_SHOWN.includes(a.transit));
  shown.forEach((a, idx) => {
    const [x1, y1] = pt(a.transitLon, R.aspect, asc);
    const [x2, y2] = pt(a.targetLon, R.aspect, asc);
    const tight = a.orb < 1;
    const sel = selected === `${a.transit}-${a.aspect}-${a.target}`;
    const cls = `asp asp-${a.tone}${sel ? ' sel' : ''}${selected && !sel ? ' dim' : ''}`;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" stroke-width="${tight ? 2.4 : 1.4}" data-asp="${a.transit}-${a.aspect}-${a.target}" style="opacity:${sel ? 1 : Math.min(0.95, 0.35 + a.strength / 400)}"><title>${esc(PLANETS[a.transit].name)} ${a.aspect} ${esc(PLANETS[a.target].name)} (orb ${a.orb.toFixed(1)}°)</title></line>`;
  });

  // natal planets (inner band)
  const natalItems = NATAL_SHOWN.filter((k) => natal.points[k]).map((k) => ({ key: k, lon: natal.points[k].lon }));
  for (const it of declutter(natalItems, 7.5)) {
    const p = natal.points[it.key];
    const [tx, ty] = pt(it.lon, R.zodiacInner, asc);
    const [tx2, ty2] = pt(it.lon, R.zodiacInner - 7, asc);
    svg += `<line x1="${tx}" y1="${ty}" x2="${tx2}" y2="${ty2}" class="w-natal-tick"/>`;
    const [gx, gy] = pt(it.disp, R.natalGlyph, asc);
    const [dx, dy] = pt(it.disp, R.natalDeg, asc);
    svg += `<g class="w-natal"><text x="${gx}" y="${gy}" text-anchor="middle" dominant-baseline="central" class="w-glyph">${PLANETS[it.key].glyph}${VS}<title>Natal ${PLANETS[it.key].name} ${(p.lon % 30).toFixed(1)}° ${SIGNS[p.sign].name}</title></text>`;
    svg += `<text x="${dx}" y="${dy}" text-anchor="middle" dominant-baseline="central" class="w-deg">${Math.floor(p.lon % 30)}°${p.retro ? 'ʀ' : ''}</text></g>`;
  }

  // transit planets (outer band)
  const trItems = TRANSIT_SHOWN.filter((k) => transit.points[k]).map((k) => ({ key: k, lon: transit.points[k].lon }));
  for (const it of declutter(trItems, 7)) {
    const p = transit.points[it.key];
    const [tx, ty] = pt(it.lon, R.zodiacOuter, asc);
    const [tx2, ty2] = pt(it.lon, R.zodiacOuter + 7, asc);
    svg += `<line x1="${tx}" y1="${ty}" x2="${tx2}" y2="${ty2}" class="w-transit-tick"/>`;
    const [gx, gy] = pt(it.disp, R.transitGlyph, asc);
    const [dx, dy] = pt(it.disp, R.transitDeg, asc);
    svg += `<g class="w-transit"><text x="${gx}" y="${gy}" text-anchor="middle" dominant-baseline="central" class="w-glyph w-tglyph">${PLANETS[it.key].glyph}${VS}<title>Transiting ${PLANETS[it.key].name} ${(p.lon % 30).toFixed(1)}° ${SIGNS[p.sign].name}${p.retro ? ' (retrograde)' : ''}</title></text>`;
    svg += `<text x="${dx}" y="${dy}" text-anchor="middle" dominant-baseline="central" class="w-deg w-tdeg">${Math.floor(p.lon % 30)}°${p.retro ? 'ʀ' : ''}</text></g>`;
  }

  svg += `</svg>`;
  return svg;
}
