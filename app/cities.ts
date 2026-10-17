// Offline city list, loaded from app/data/cities.json (GeoNames cities15000, CC BY 4.0, via
// tools/dev/import-cities.mjs, plus the hand-curated v1 rows). Coordinates to 1e-4 deg. Bundled into the
// app JS, so the service worker precaches it with the shell and search works offline.
import DATA from './data/cities.json' with { type: 'json' };

export interface City { name: string; region: string; lat: number; lon: number; tz: string; alt?: string[]; pop?: number; }

const D = DATA as { tz: string[]; rows: (string | number | string[])[][] };
export const CITIES: City[] = D.rows.map(r => {
  const c: City = { name: r[0] as string, region: r[1] as string, lat: (r[2] as number) / 1e4, lon: (r[3] as number) / 1e4, tz: D.tz[r[4] as number], pop: r[5] as number };
  if (r[6]) c.alt = r[6] as string[];
  return c;
});
export const CITY_ATTRIBUTION = 'City list: GeoNames (geonames.org), CC BY 4.0.';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const isLatin = (s: string) => !/[^\u0000-ɏ\s.'-]/.test(s);
/** Diacritic-insensitive prefix/contains search over name, region and alternates; native-script queries match alternates directly. */
export function searchCities(q: string, limit = 12): City[] {
  const raw = q.trim();
  if (!raw) return CITIES.slice(0, limit);
  const n = norm(raw); const latin = isLatin(raw);
  const starts: City[] = [], contains: City[] = [];
  for (const city of CITIES) {
    if (latin) {
      const hay = [city.name, city.region, ...(city.alt ?? []).filter(isLatin)].map(norm);
      if (hay.some(h => h.startsWith(n))) starts.push(city);
      else if (hay.some(h => h.includes(n))) contains.push(city);
    } else {
      const alts = city.alt ?? [];
      if (alts.some(a => a.startsWith(raw))) starts.push(city);
      else if (alts.some(a => a.includes(raw))) contains.push(city);
    }
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
/** Nearest city; among the cities within ~10 km of the nearest one, the most populous wins (so a Toronto GPS fix says Toronto, not East York). */
export function nearestCity(lat: number, lon: number): City {
  let best = CITIES[0], bd = Infinity;
  const k = Math.cos(lat * Math.PI / 180);
  const dist = (city: City) => (city.lat - lat) ** 2 + ((city.lon - lon) * k) ** 2;
  for (const city of CITIES) { const d = dist(city); if (d < bd) { bd = d; best = city; } }
  const near = CITIES.filter(c => dist(c) <= Math.max(bd, 0) + 0.09 * 0.09);
  return near.reduce((a, b) => ((b.pop ?? 0) > (a.pop ?? 0) ? b : a), best);
}
