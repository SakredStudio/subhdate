// Composes the framed Play Store screenshots (1080×1920) and the feature graphic (1024×500) from the raw captures.
// Each frame is an HTML page (paper gradient, headline + subhead in the shot's language, the raw screenshot inside a
// rounded phone mask with a soft shadow) rendered in headless Chromium so Cormorant / Noto fonts shape correctly,
// then compressed with sharp (each PNG ≤ 1 MB). Output: store/screenshots/{en,hi,gu}/NN-slug.png, store/feature-graphic.png.
//   node tools/dev/store-frames.mjs          (after store-shots.mjs)
import { readFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs')); }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = resolve(ROOT, 'store/screenshots/raw');
const FONTS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;500;600&family=Noto+Serif+Devanagari:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500&family=Noto+Sans+Gujarati:wght@400;500;600&display=swap';
const dataUri = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

// headline + subhead per shot per language (never "lucky", never a prediction)
const COPY = {
  en: {
    '01-today-gu': ['Your panchang, your language', 'Tithi, nakshatra, yoga and karana with end times, in Gujarati, Hindi, English and more.'],
    '02-today-toronto': ['Right for your city', 'Sunrise-based dates for Toronto, London, Nairobi or Ahmedabad. Diaspora dates can differ from India by a day; we say so.'],
    '03-muhurta-results': ['Find a muhurta', 'Weddings, griha pravesh and ten more events. Ranked days from the classical rules, computed on your phone.'],
    '04-result-detail': ['The reason, not just the date', 'Every window explains which rules hold and which do not, with the source text named.'],
    '05-festivals': ['Festivals by rule, not by list', 'Diwali, Karwa Chauth, Ekadashi: computed for your sunrise, with the puja window.'],
    '06-report-preview': ['A report your pandit can check', 'Five days, full panchanga, sankalpa in Devanagari, every rule with its source. Print to PDF.'],
    '07-today-night': ['Paper by day, night by night', 'A calm paper theme and a night theme. No ads, ever.'],
    '08-settings': ['No account. No tracking.', 'Everything is computed on your device. Birth details never leave your phone.'],
  },
  hi: {
    '01-today-gu': ['आपका पंचांग, आपकी भाषा में', 'तिथि, नक्षत्र, योग और करण समाप्ति समय सहित: हिन्दी, गुजराती, अंग्रेज़ी और अन्य।'],
    '02-today-toronto': ['आपके शहर के लिए सही', 'टोरंटो, लंदन या अहमदाबाद: सूर्योदय के अनुसार तिथियाँ। विदेश में तिथि भारत से एक दिन अलग हो सकती है; हम बताते हैं।'],
    '03-muhurta-results': ['मुहूर्त खोजें', 'विवाह, गृहप्रवेश और दस अन्य कार्य। शास्त्रीय नियमों से चुने दिन, आपके फ़ोन पर ही गणना।'],
    '04-result-detail': ['सिर्फ़ तारीख़ नहीं, कारण भी', 'हर मुहूर्त बताता है कौन-से नियम लागू हैं और कौन-से नहीं, स्रोत के नाम के साथ।'],
    '05-festivals': ['त्योहार नियम से, सूची से नहीं', 'दीपावली, करवा चौथ, एकादशी: आपके सूर्योदय के अनुसार, पूजा के समय सहित।'],
    '06-report-preview': ['ऐसी रिपोर्ट जो पंडित जी जाँच सकें', 'पाँच दिन, पूरा पंचांग, देवनागरी में संकल्प, हर नियम अपने स्रोत के साथ। PDF में छापें।'],
  },
  gu: {
    '01-today-gu': ['તમારું પંચાંગ, તમારી ભાષામાં', 'તિથિ, નક્ષત્ર, યોગ અને કરણ પૂર્ણ થવાના સમય સાથે: ગુજરાતી, હિન્દી, અંગ્રેજી અને વધુ.'],
    '02-today-toronto': ['તમારા શહેર માટે સાચું', 'ટોરોન્ટો, લંડન કે અમદાવાદ: સૂર્યોદય મુજબ તિથિઓ. પરદેશમાં તિથિ ભારતથી એક દિવસ જુદી હોઈ શકે; અમે કહીએ છીએ.'],
    '03-muhurta-results': ['મુહૂર્ત શોધો', 'લગ્ન, ગૃહપ્રવેશ અને બીજાં દસ કાર્યો. શાસ્ત્રીય નિયમોથી પસંદ કરેલા દિવસો, તમારા ફોન પર જ ગણતરી.'],
    '04-result-detail': ['માત્ર તારીખ નહીં, કારણ પણ', 'દરેક મુહૂર્ત કહે છે કયા નિયમો લાગુ છે અને કયા નહીં, સ્રોતના નામ સાથે.'],
    '05-festivals': ['તહેવારો નિયમથી, યાદીથી નહીં', 'દિવાળી, કરવા ચોથ, અગિયારસ: તમારા સૂર્યોદય મુજબ, પૂજાના સમય સાથે.'],
    '06-report-preview': ['એવી રિપોર્ટ જે ગોર મહારાજ ચકાસી શકે', 'પાંચ દિવસ, પૂરું પંચાંગ, દેવનાગરીમાં સંકલ્પ, દરેક નિયમ પોતાના સ્રોત સાથે. PDF માં છાપો.'],
  },
};
const FONT_FAMILY = { en: "'DM Sans', sans-serif", hi: "'Noto Sans Devanagari', 'DM Sans', sans-serif", gu: "'Noto Sans Gujarati', 'DM Sans', sans-serif" };
const HEAD_FAMILY = { en: "'Cormorant Garamond', serif", hi: "'Noto Serif Devanagari', serif", gu: "'Noto Sans Gujarati', sans-serif" };

const frameHtml = (lang, headline, sub, img, dark) => `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>
  html, body { margin: 0; width: 360px; height: 640px; overflow: hidden; }
  body { background: ${dark ? 'radial-gradient(420px 320px at 50% 0%, #1A2440 0%, #0B1020 70%)' : 'radial-gradient(420px 320px at 50% 0%, #FDF8EE 0%, #F7F0E3 70%)'}; font-family: ${FONT_FAMILY[lang]}; color: ${dark ? '#F8F3E8' : '#251C30'}; font-synthesis: none; }
  .top { padding: 30px 26px 0; text-align: center; height: 150px; box-sizing: border-box; }
  h1 { font-family: ${HEAD_FAMILY[lang]}; font-weight: ${lang === 'en' ? 500 : 600}; font-size: ${lang === 'en' ? 29 : 24}px; line-height: 1.15; margin: 0 0 8px; color: ${dark ? '#E6C97A' : '#251C30'}; }
  p { margin: 0; font-size: 12.5px; line-height: 1.45; color: ${dark ? 'rgba(248,243,232,0.7)' : 'rgba(37,28,48,0.68)'}; }
  .phone { position: absolute; left: 50%; top: 158px; width: 296px; height: 526px; transform: translateX(-50%); border-radius: 30px; overflow: hidden; border: 3px solid ${dark ? '#2A3658' : '#2B2238'}; box-shadow: 0 24px 50px rgba(37,28,48,0.28), 0 0 0 1px rgba(0,0,0,0.05); background: #000; }
  .phone img { display: block; width: 296px; height: auto; }
  .brand { position: absolute; left: 0; right: 0; top: 10px; text-align: center; font-family: 'Cormorant Garamond', serif; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: ${dark ? '#D4A84F' : '#946916'}; }
</style></head><body>
  <div class="brand">ShubhDate</div>
  <div class="top"><h1>${headline}</h1><p>${sub}</p></div>
  <div class="phone"><img src="${img}" alt=""></div>
</body></html>`;

const featureHtml = (hero) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>
  html, body { margin: 0; width: 1024px; height: 500px; overflow: hidden; }
  body { background: radial-gradient(900px 500px at 70% 50%, #FDF8EE 0%, #F7F0E3 70%); font-family: 'DM Sans', sans-serif; color: #251C30; position: relative; }
  .hero { position: absolute; right: 70px; top: 30px; width: 440px; height: 440px; mix-blend-mode: multiply; }
  .text { position: absolute; left: 80px; top: 120px; width: 460px; }
  .name { font-family: 'Cormorant Garamond', serif; font-weight: 500; font-size: 84px; line-height: 1; letter-spacing: 0.01em; }
  .tag { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 30px; color: #7E2D3D; margin-top: 14px; }
  .sub { font-size: 17px; color: rgba(37,28,48,0.68); margin-top: 18px; line-height: 1.4; }
  .pill { display: inline-block; margin-top: 22px; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #946916; border: 1px solid #DCCFB4; border-radius: 20px; padding: 6px 14px; background: #FFFDF8; }
</style></head><body>
  <img class="hero" src="${hero}" alt="">
  <div class="text"><div class="name">ShubhDate</div><div class="tag">The right moment, and the reason why.</div>
  <div class="sub">Panchang, muhurta and festivals for your city, in your language. Computed on your phone. No ads, no account.</div>
  <div class="pill">Hindi · Gujarati · English · Hinglish</div></div>
</body></html>`;

async function render(page, html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
  const buf = await page.screenshot({ type: 'png' });
  await sharp(buf).png({ compressionLevel: 9, palette: true, quality: 90, dither: 0.6 }).toFile(out);
  const kb = Math.round(statSync(out).size / 1024);
  if (kb > 1000) { await sharp(buf).png({ compressionLevel: 9, palette: true, colours: 128 }).toFile(out); }
  console.log(out.replace(ROOT + '/', ''), Math.round(statSync(out).size / 1024) + ' KB');
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 3 });
const page = await ctx.newPage();
for (const lang of ['en', 'hi', 'gu']) {
  mkdirSync(resolve(ROOT, 'store/screenshots', lang), { recursive: true });
  for (const [id, [headline, sub]] of Object.entries(COPY[lang])) {
    const img = dataUri(resolve(RAW, `${id}.png`));
    await render(page, frameHtml(lang, headline, sub, img, id === '07-today-night'), 360, 640, resolve(ROOT, 'store/screenshots', lang, `${id}.png`));
  }
}
const fctx = await browser.newContext({ deviceScaleFactor: 1 }); const fpage = await fctx.newPage();
await render(fpage, featureHtml(dataUri(resolve(ROOT, 'public/hero.png'))), 1024, 500, resolve(ROOT, 'store/feature-graphic.png'));
await browser.close();
const meta = await sharp(resolve(ROOT, 'store/feature-graphic.png')).metadata();
writeFileSync(resolve(ROOT, 'store/screenshots/.sizes.txt'), `feature-graphic ${meta.width}x${meta.height}\n`);
