import { panchang } from '../../engine/panchanga.ts';
import { hhmm } from '../../engine/time.ts';
import { readFileSync } from 'node:fs';
const j = JSON.parse(readFileSync('engine/test/golden/drik-manual.json', 'utf8'));
for (const r of j.rows) {
  const p = panchang(r.date, r.place);
  console.log(r.place.name.padEnd(10), r.date, 'moonrise engine', p.moonrise ? hhmm(p.moonrise, r.place.tz) : 'none', 'drik', r.moonrise ?? '-', '| moonset engine', p.moonset ? hhmm(p.moonset, r.place.tz) : 'none', 'drik', r.moonset ?? '-', '| tithi', p.tithi[0].name, hhmm(p.tithi[0].end, r.place.tz), 'drik', r.tithi, r.tithiEnd);
}
