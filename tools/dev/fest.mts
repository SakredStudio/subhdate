import { festivals } from '../../engine/festivals.ts';
const DELHI = { lat: 28.6139, lon: 77.209, tz: 'Asia/Kolkata', name: 'New Delhi' };
for (const f of festivals('2026-11-05', '2026-11-25', DELHI)) console.log(f.date, f.id, f.tithiLabel);
