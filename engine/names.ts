// Canonical English (IAST-lite) names used as keys throughout the engine. Display names per language
// live in i18n/. Order matters: index = classical number. Sources: research/02 §2.1, §4.1, §4.3, §5.4.

export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
  'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
] as const;
/** Name of tithi number 1..30 (16..29 repeat Krishna 1..14, 30 = Amavasya). */
export function tithiName(n: number): string {
  if (n === 30) return 'Amavasya';
  if (n === 15) return 'Purnima';
  return TITHI_NAMES[(n - 1) % 15];
}
/** Tithi groups (Jyotisha Ratnamala tradition, research/02 §4.3). */
export function tithiGroup(n: number): 'Nanda' | 'Bhadra' | 'Jaya' | 'Rikta' | 'Purna' {
  const k = ((n - 1) % 15) + 1; // 1..15
  return (['Nanda', 'Bhadra', 'Jaya', 'Rikta', 'Purna'] as const)[(k - 1) % 5];
}

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
] as const;

export const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma', 'Dhriti', 'Shula',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan', 'Parigha',
  'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
] as const;

export const KARANA_MOVABLE = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'] as const;
/** Karana name for half-tithi slot k = 0..59 (research/02 §2.1). */
export function karanaName(k: number): string {
  if (k === 0) return 'Kimstughna';
  if (k === 57) return 'Shakuni';
  if (k === 58) return 'Chatushpada';
  if (k === 59) return 'Naga';
  return KARANA_MOVABLE[(k - 1) % 7];
}

export const VARA_NAMES = ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvara', 'Shukravara', 'Shanivara'] as const;
export const VARA_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const VARA_LORD = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

export const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
] as const;

/** Lunar month names, index 1 = Chaitra (named for Mesha sankranti) .. 12 = Phalguna (Meena). */
export const MASA_NAMES = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada', 'Ashwina', 'Kartika',
  'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
] as const;

export const RITU_NAMES = ['Vasanta', 'Grishma', 'Varsha', 'Sharad', 'Hemanta', 'Shishira'] as const;

/** 60-year Jovian cycle. Names per the standard Prabhava list. Mapping to years: research/02 §2.3 (no list given
 *  there); offsets below were checked against printed 2024-27 panchang years and are marked UNVERIFIED in data. */
export const SAMVATSARA_NAMES = [
  'Prabhava', 'Vibhava', 'Shukla', 'Pramoda', 'Prajapati', 'Angirasa', 'Shrimukha', 'Bhava', 'Yuva', 'Dhatri',
  'Ishvara', 'Bahudhanya', 'Pramathi', 'Vikrama', 'Vrisha', 'Chitrabhanu', 'Svabhanu', 'Tarana', 'Parthiva', 'Vyaya',
  'Sarvajit', 'Sarvadhari', 'Virodhi', 'Vikriti', 'Khara', 'Nandana', 'Vijaya', 'Jaya', 'Manmatha', 'Durmukhi',
  'Hevilambi', 'Vilambi', 'Vikari', 'Sharvari', 'Plava', 'Shubhakrit', 'Shobhakrit', 'Krodhi', 'Vishvavasu', 'Parabhava',
  'Plavanga', 'Kilaka', 'Saumya', 'Sadharana', 'Virodhikrit', 'Paridhavi', 'Pramadi', 'Ananda', 'Rakshasa', 'Anala',
  'Pingala', 'Kalayukti', 'Siddharthi', 'Raudra', 'Durmati', 'Dundubhi', 'Rudhirodgari', 'Raktakshi', 'Krodhana', 'Akshaya',
] as const;
