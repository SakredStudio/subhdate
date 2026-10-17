// About / How we calculate, and Privacy. Truthful, specific, no marketing.
export function aboutHtml(t: (k: string) => string): string {
  return `<a href="#/settings" class="small">‹ ${t('nav.settings')}</a><h1>${t('about.title')}</h1>
  <div class="card"><p>ShubhDate reads the panchanga the way a careful pandit would, following <b>Muhurta Chintamani</b> and <b>Dharmasindhu</b>, with observed (drik) planetary positions and the <b>Lahiri (Chitrapaksha)</b> ayanamsa. It cannot know your family's customs. Treat its suggestions as a shortlist and let your purohit or elders make the final call. The tradition itself says the best muhurta is the one begun with shraddha.</p></div>
  <div class="card"><h3>Astronomy</h3><ul class="reasons">
    <li>Positions: <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener">astronomy-engine</a> (MIT), apparent geocentric, true ecliptic of date. Validated against Swiss Ephemeris: Moon longitude within 6.4″ at every hour of 2024–2030, Sun within 1.7″.</li>
    <li>Ayanamsa: Lahiri as defined by Swiss Ephemeris (SE_SIDM_LAHIRI), 24°14′ in late 2026. Drik Panchang's printed value runs about 16″ ahead; this moves a sankranti instant by ~4 minutes and nothing else at minute resolution.</li>
    <li>Sunrise: upper limb with 34′ refraction (the Drik Panchang and newspaper convention). The disc-centre, no-refraction convention used by some Tamil and Kerala panchangams is available in Settings. Moonrise is topocentric (parallax applied), which is what printed panchangs list.</li>
    <li>The Vedic day runs sunrise to sunrise. Tithi, nakshatra, yoga and karana are reported as they stand at sunrise, with every end instant found by root-finding to the second.</li>
    <li>Months: amanta and purnimanta are both computed; an amanta month with no sankranti is adhika. Gujarati Vikram Samvat rolls on Kartika Shukla 1, the North Indian one on Chaitra Shukla 1.</li>
  </ul></div>
  <div class="card"><h3>Rules</h3><ul class="reasons">
    <li>Every rule is a data row with its source: Muhurta Chintamani, Dharmasindhu (kamakoti digest), Kalaprakashika via B.V. Raman's <i>Muhurtha</i>, Brihat Samhita, Drik Panchang and dekhopanchang reference pages. Rows the research could not verify are marked UNVERIFIED in the open-source engine.</li>
    <li>Weddings and house entry use fully tuned rule packs. The other ten events use a general pack with their classical nakshatra lists; it is honest but coarser.</li>
    <li>Lagna shuddhi (the 21 mahadoshas of the wedding lagna), night Rahu kaal and Vakya/Thirukanitha modes are not in this version.</li>
    <li>Scores are 50 ± the weights of the rules that hold at that moment, never a prediction. "Auspicious" here means "aligned with the tradition's rules", nothing more.</li>
  </ul></div>
  <div class="card"><h3>Verification</h3><p class="small">6 cities × 60 days checked against Swiss Ephemeris (7,160 checks, 100% within tolerance) and 15 hand-read Drik Panchang pages (sunrise, moonrise, tithi/nakshatra/yoga ends, Rahu kaal, Choghadiya all within a minute). Regional disagreement between panchangs is normal: sunrise convention, ayanamsa variant and amanta/purnimanta naming explain nearly all of it.</p></div>
  <div class="card"><h3>Open source</h3><p class="small">The engine is MIT-licensed: <a href="https://github.com/SakredStudio/subhdate" target="_blank" rel="noopener">github.com/SakredStudio/subhdate</a>. The app's design and copy are proprietary.</p><p class="small">City list: <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a> (cities15000), licensed <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>, with hand-curated additions.</p></div>
  <p class="small dim">ShubhDate by Sakred Studio (1789918 Canada Inc.), Toronto. No ads, no account, no tracking.</p>`;
}
export function privacyHtml(t: (k: string) => string): string {
  return `<a href="#/settings" class="small">‹ ${t('nav.settings')}</a><h1>${t('privacy.title')}</h1>
  <div class="card"><ul class="reasons">
    <li><b>Birth details</b> (date, time, place) are stored only in this browser's local storage and used only to compute your janma nakshatra, Tara bala and Chandra bala on this device. They are never transmitted. Clear them any time in Settings.</li>
    <li><b>Saved dates</b> and computed days are cached in this browser's IndexedDB so the app works offline.</li>
    <li><b>Location</b> is used only if you tap "Use my location", only to pick the nearest city, and is not stored beyond the chosen coordinates.</li>
    <li>There is <b>no account</b>, no analytics and no advertising SDK. The only network requests are for the app files, the Google Fonts stylesheet, and the two optional features below, which you turn on yourself.</li>
    <li>Sharing a muhurta or printing a report uses your device's share sheet, WhatsApp or print dialog; the text and the PDF are composed on your device.</li>
    <li><b>Festival and vrat reminders</b> (optional, off by default): when you turn them on in Settings, the app sends your push endpoint, your home city's coordinates and time zone, your language, region and chosen topics to the ShubhDate reminder server (a Cloudflare Worker) so it can send the notifications. Birth details are never sent. Turning the toggle off deletes the subscription from the server.</li>
    <li><b>Purchases</b> (Android app only): Google Play Billing handles the payment; ShubhDate never sees your payment details. The app sends Google's purchase token and an anonymous device id to the ShubhDate server, which stores a hash of the token and that id, never a name or email. The web app sells nothing.</li>
  </ul></div>
  <p class="small"><a href="privacy.html" target="_blank" rel="noopener">Full privacy policy</a></p>
  <p class="small dim">Questions: open an issue at github.com/SakredStudio/subhdate.</p>`;
}
