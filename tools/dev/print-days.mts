// Dev helper: node tools/dev/print-days.mts <city> <date> [<date> ...]
import { panchang } from '../../engine/panchanga.ts';
import { hhmm } from '../../engine/time.ts';
const CITIES: Record<string, any> = {
  delhi: { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' },
  ahmedabad: { lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata', name: 'Ahmedabad' },
  toronto: { lat: 43.6532, lon: -79.3832, tz: 'America/Toronto', name: 'Toronto' },
  mumbai: { lat: 19.076, lon: 72.8777, tz: 'Asia/Kolkata', name: 'Mumbai' },
};
const [city, ...dates] = process.argv.slice(2);
const P = CITIES[city];
for (const d of dates) {
  const p = panchang(d, P);
  console.log(d, p.vara.short, 'sr', hhmm(p.sunrise, P.tz), 'ss', hhmm(p.sunset, P.tz), p.masa.amanta.name + (p.masa.amanta.adhika ? '*' : '') + '(A)', p.masa.purnimanta.name + '(P)',
    '|', p.tithi.map(t => `${t.paksha[0]}${t.num > 15 ? t.num - 15 : t.num} ${t.name} till ${hhmm(t.end, P.tz)}${t.kshaya ? ' KSHAYA' : ''}`).join(' | '),
    '|| nak', p.nakshatra.map(n => `${n.name} till ${hhmm(n.end, P.tz)}`).join(', '),
    '|| yoga', p.yoga.map(n => `${n.name} till ${hhmm(n.end, P.tz)}`).join(', '));
}
