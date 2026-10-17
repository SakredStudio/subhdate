// Builds app/data/cities.json from GeoNames cities15000 (CC BY 4.0, https://www.geonames.org/).
// Usage:  node tools/dev/import-cities.mjs            (downloads cities15000.zip into tools/dev/out/, gitignored)
//         node tools/dev/import-cities.mjs --input tools/dev/out/cities15000.txt   (use a local copy; .zip or .txt)
// Columns (GeoNames readme): 0 geonameid, 1 name, 2 asciiname, 3 alternatenames, 4 lat, 5 lon, 6 feature class,
// 7 feature code, 8 country, 9 cc2, 10 admin1, 11 admin2, 12 admin3, 13 admin4, 14 population, 15 elevation,
// 16 dem, 17 timezone, 18 modification date.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = resolve(ROOT, 'tools/dev/out');
const URL = 'https://download.geonames.org/export/dump/cities15000.zip';
const KEEP_ALL = new Set(['IN', 'NP', 'LK', 'BD', 'BT', 'MU', 'FJ', 'TT', 'GY', 'SR']);
const KEEP_100K = new Set(['CA', 'US', 'GB', 'AU', 'NZ', 'SG', 'MY', 'ZA', 'AE', 'QA', 'KW', 'OM', 'BH', 'SA', 'KE', 'TZ', 'UG', 'DE', 'NL', 'FR', 'IE', 'IT', 'PT', 'ES']);
const COUNTRY = { IN: 'India', NP: 'Nepal', LK: 'Sri Lanka', BD: 'Bangladesh', BT: 'Bhutan', MU: 'Mauritius', FJ: 'Fiji', TT: 'Trinidad and Tobago', GY: 'Guyana', SR: 'Suriname', CA: 'Canada', US: 'United States', GB: 'United Kingdom', AU: 'Australia', NZ: 'New Zealand', SG: 'Singapore', MY: 'Malaysia', ZA: 'South Africa', AE: 'United Arab Emirates', QA: 'Qatar', KW: 'Kuwait', OM: 'Oman', BH: 'Bahrain', SA: 'Saudi Arabia', KE: 'Kenya', TZ: 'Tanzania', UG: 'Uganda', DE: 'Germany', NL: 'Netherlands', FR: 'France', IE: 'Ireland', IT: 'Italy', PT: 'Portugal', ES: 'Spain', HK: 'Hong Kong', TH: 'Thailand', ID: 'Indonesia', JP: 'Japan', KR: 'South Korea', PH: 'Philippines', JM: 'Jamaica', MX: 'Mexico', BR: 'Brazil', AR: 'Argentina', NG: 'Nigeria', EG: 'Egypt', PK: 'Pakistan' };
// GeoNames admin1 codes for India (admin1CodesASCII.txt)
const IN_ADMIN1 = { '01': 'Andaman and Nicobar', '02': 'Andhra Pradesh', '03': 'Assam', '05': 'Chhattisgarh', '06': 'Chandigarh', '07': 'Delhi', '09': 'Gujarat', '10': 'Haryana', '11': 'Himachal Pradesh', '12': 'Jammu and Kashmir', '13': 'Kerala', '14': 'Lakshadweep', '16': 'Maharashtra', '17': 'Manipur', '18': 'Meghalaya', '19': 'Karnataka', '20': 'Nagaland', '21': 'Odisha', '22': 'Puducherry', '23': 'Punjab', '24': 'Rajasthan', '25': 'Tamil Nadu', '26': 'Tripura', '28': 'West Bengal', '29': 'Sikkim', '30': 'Arunachal Pradesh', '31': 'Mizoram', '32': 'Daman and Diu', '33': 'Goa', '34': 'Bihar', '35': 'Madhya Pradesh', '36': 'Uttar Pradesh', '37': 'Dadra and Nagar Haveli', '38': 'Jharkhand', '39': 'Uttarakhand', '40': 'Telangana', '41': 'Ladakh' };
const CA_ADMIN1 = { '01': 'Alberta', '02': 'British Columbia', '03': 'Manitoba', '04': 'New Brunswick', '05': 'Newfoundland and Labrador', '07': 'Nova Scotia', '08': 'Ontario', '09': 'Prince Edward Island', '10': 'Quebec', '11': 'Saskatchewan', '12': 'Yukon', '13': 'Northwest Territories', '14': 'Nunavut' };
const AU_ADMIN1 = { '01': 'ACT', '02': 'New South Wales', '03': 'Northern Territory', '04': 'Queensland', '05': 'South Australia', '06': 'Tasmania', '07': 'Victoria', '08': 'Western Australia' };
const GB_ADMIN1 = { ENG: 'England', SCT: 'Scotland', WLS: 'Wales', NIR: 'Northern Ireland' };
const INDIC = /[ऀ-෿]/; // Devanagari .. Sinhala

function unzipFirstEntry(buf) {
  // central directory: find EOCD, then the first central header, then the local header + deflated data
  let eocd = buf.length - 22; while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip');
  const cdOff = buf.readUInt32LE(eocd + 16);
  if (buf.readUInt32LE(cdOff) !== 0x02014b50) throw new Error('bad central directory');
  const method = buf.readUInt16LE(cdOff + 10), csize = buf.readUInt32LE(cdOff + 20), nlen = buf.readUInt16LE(cdOff + 28), xlen = buf.readUInt16LE(cdOff + 30), clen = buf.readUInt16LE(cdOff + 32), lhOff = buf.readUInt32LE(cdOff + 42);
  void nlen; void xlen; void clen;
  const lnlen = buf.readUInt16LE(lhOff + 26), lxlen = buf.readUInt16LE(lhOff + 28);
  const data = buf.subarray(lhOff + 30 + lnlen + lxlen, lhOff + 30 + lnlen + lxlen + csize);
  return method === 8 ? inflateRawSync(data) : method === 0 ? data : (() => { throw new Error('unsupported zip method ' + method); })();
}

async function loadText() {
  const i = process.argv.indexOf('--input');
  let path = i >= 0 ? resolve(process.argv[i + 1]) : resolve(OUT_DIR, 'cities15000.zip');
  if (i < 0 && !existsSync(path)) {
    mkdirSync(OUT_DIR, { recursive: true });
    console.log('downloading', URL);
    const res = await fetch(URL); if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  const buf = readFileSync(path);
  return path.endsWith('.zip') ? unzipFirstEntry(buf).toString('utf8') : buf.toString('utf8');
}

/** Hand-curated names and native-script alternates carried over from the v1 list (app/cities.ts before this import). */
async function curatedList() {
  const src = readFileSync(resolve(ROOT, 'tools/dev/cities-curated.json'), 'utf8');
  return JSON.parse(src);
}

const text = await loadText();
const curated = await curatedList();
const rows = []; let latestMod = '';
for (const line of text.split('\n')) {
  if (!line) continue;
  const c = line.split('\t');
  const cc = c[8], pop = Number(c[14]) || 0;
  if (!(KEEP_ALL.has(cc) || (KEEP_100K.has(cc) && pop >= 100000))) continue;
  const admin = cc === 'IN' ? (IN_ADMIN1[c[10]] ?? 'India') : cc === 'CA' ? `${CA_ADMIN1[c[10]] ?? ''}, Canada`.replace(/^, /, '') : cc === 'AU' ? `${AU_ADMIN1[c[10]] ?? ''}, Australia`.replace(/^, /, '') : cc === 'GB' ? `${GB_ADMIN1[c[10]] ?? ''}, United Kingdom`.replace(/^, /, '') : cc === 'US' ? `${c[10]}, United States` : (COUNTRY[cc] ?? cc);
  const alt = [];
  if (cc === 'IN') for (const a of c[3].split(',')) { const m = a.match(/[ऀ-෿][ऀ-෿\s]*/); if (m) alt.push(m[0].trim()); }
  if (c[18] > latestMod) latestMod = c[18];
  rows.push({ id: Number(c[0]), name: c[1], ascii: c[2], lat: Number(c[4]), lon: Number(c[5]), cc, admin, pop, tz: c[17], alt: [...new Set(alt)] });
}
// Native-script alternates only for the top 200 Indian cities by population (keeps the file small); others keep none.
const inTop = rows.filter(r => r.cc === 'IN').sort((a, b) => b.pop - a.pop).slice(0, 200);
const topIds = new Set(inTop.map(r => r.id));
for (const r of rows) if (!topIds.has(r.id)) r.alt = [];
// Carry over the curated list: alternates merge into the matching row (same tz, within ~0.15°); unmatched rows are added as-is.
const near = (r, c) => r.tz === c.tz && Math.abs(r.lat - c.lat) < 0.15 && Math.abs(r.lon - c.lon) < 0.15;
let added = 0, merged = 0;
for (const c of curated) {
  const nm = c.name.toLowerCase();
  let hit = rows.find(r => near(r, c) && (r.name.toLowerCase() === nm || r.ascii.toLowerCase() === nm));
  if (!hit) hit = rows.filter(r => near(r, c)).sort((a, b) => b.pop - a.pop)[0];
  if (hit) { if (hit.name !== c.name && !/^[A-Za-z -]+$/.test(hit.name)) hit.name = c.name; for (const a of c.alt ?? []) if (!hit.alt.includes(a) && a !== hit.name) hit.alt.push(a); if (c.name !== hit.name && !hit.alt.includes(c.name)) hit.alt.push(c.name); merged++; }
  else { rows.push({ id: 0, name: c.name, ascii: c.name, lat: c.lat, lon: c.lon, cc: '', admin: c.region, pop: 0, tz: c.tz, alt: c.alt ?? [] }); added++; }
}
// dedupe exact name + admin (keep the larger), then order: New Delhi first, then population desc
const byKey = new Map();
for (const r of rows) { const k = `${r.name}|${r.admin}`; const prev = byKey.get(k); if (!prev || r.pop > prev.pop) byKey.set(k, r); }
let list = [...byKey.values()].sort((a, b) => b.pop - a.pop);
const nd = list.findIndex(r => r.name === 'New Delhi'); if (nd > 0) list.unshift(...list.splice(nd, 1));
const tzs = [...new Set(list.map(r => r.tz))].sort();
const out = {
  _about: `City list derived from GeoNames cities15000 (CC BY 4.0, https://www.geonames.org/; latest row modified ${latestMod}) by tools/dev/import-cities.mjs, plus the hand-curated v1 rows. Row = [name, region, lat*1e4, lon*1e4, tzIndex, population, altNames?].`,
  tz: tzs,
  rows: list.map(r => { const row = [r.name, r.admin, Math.round(r.lat * 1e4), Math.round(r.lon * 1e4), tzs.indexOf(r.tz), r.pop]; if (r.alt.length) row.push(r.alt); return row; }),
};
mkdirSync(resolve(ROOT, 'app/data'), { recursive: true });
const json = JSON.stringify(out);
writeFileSync(resolve(ROOT, 'app/data/cities.json'), json + '\n');
console.log(`rows ${list.length} (IN ${list.filter(r => r.cc === 'IN').length}), curated merged ${merged} added ${added}, tz ${tzs.length}, ${(json.length / 1024).toFixed(0)} KB, latest GeoNames modification ${latestMod}`);
