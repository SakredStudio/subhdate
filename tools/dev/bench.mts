import { festivals } from '../../engine/festivals.ts';
import { panchang, clearPanchangCache } from '../../engine/panchanga.ts';
const T = { lat: 43.6532, lon: -79.3832, tz: 'America/Toronto', name: 'Toronto' };
let t0 = Date.now(); for (let i = 0; i < 30; i++) panchang(new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10), T); console.log('30 panchang days (fresh):', Date.now() - t0, 'ms');
t0 = Date.now(); const f = festivals('2026-10-13', '2027-05-01', T); console.log('festivals 200 days incl Delhi:', Date.now() - t0, 'ms', f.length, 'results');
