import { describe, it, expect } from 'vitest';
import DATA from '../../app/data/cities.json' with { type: 'json' };
import { CITIES, searchCities, nearestCity } from '../../app/cities.ts';

describe('city list (GeoNames import)', () => {
  it('has ≥ 3000 rows, New Delhi first, and the key cities present', () => {
    expect(DATA.rows.length).toBeGreaterThanOrEqual(3000);
    expect(CITIES[0].name).toBe('New Delhi');
    for (const n of ['Ahmedabad', 'Toronto', 'Leicester', 'Nairobi', 'Mumbai', 'Kathmandu', 'Colombo', 'Port Louis', 'Suva', 'Port of Spain']) expect(CITIES.find(c => c.name === n), n).toBeTruthy();
  });
  it('every tz is a valid IANA zone for Intl.DateTimeFormat', () => {
    for (const tz of DATA.tz) expect(() => new Intl.DateTimeFormat('en', { timeZone: tz }), tz).not.toThrow();
    for (const c of CITIES) { expect(typeof c.tz).toBe('string'); expect(Math.abs(c.lat)).toBeLessThanOrEqual(90); expect(Math.abs(c.lon)).toBeLessThanOrEqual(180); }
  });
  it('search is diacritic-insensitive and native-script search works', () => {
    expect(searchCities('ahmed')[0].name).toBe('Ahmedabad');
    expect(searchCities('Bombay')[0].name).toBe('Mumbai');
    expect(searchCities('અમદાવાદ')[0].name).toBe('Ahmedabad');
    expect(searchCities('दिल्ली').some(c => /Delhi/.test(c.name))).toBe(true);
    expect(searchCities('toron')[0].name).toBe('Toronto');
    expect(searchCities('').length).toBe(12);
  });
  it('nearestCity', () => {
    expect(nearestCity(43.65, -79.38).name).toBe('Toronto');
    expect(nearestCity(23.02, 72.57).name).toBe('Ahmedabad');
  });
});
