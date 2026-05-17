/*
 * Rewrite index.html to use optimized <picture>/figure blocks.
 * Idempotent: reads original markers, only replaces what's still legacy.
 */
const fs   = require('fs');
const path = require('path');
const s    = require('./snippets.json');

const file = path.join(__dirname, '..', 'index.html');
let html   = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const must = (oldStr, newStr, label) => {
  if (!html.includes(oldStr)) {
    if (html.includes(newStr)) { console.log(`[skip] ${label} already updated`); return; }
    throw new Error(`[fail] ${label}: legacy block not found`);
  }
  html = html.replace(oldStr, newStr);
  console.log(`[ok]   ${label}`);
};

// 1. preload link → use webp + imagesrcset
must(
  '<link rel="preload" as="image" href="assets/img/hall-grand.jpg" fetchpriority="high">',
  `<link rel="preload" as="image" href="${s.heroPoster.preload}" imagesrcset="${s.heroPoster.preloadSrcset}" imagesizes="100vw" fetchpriority="high">`,
  'hero preload'
);

// 2. Video poster: keep original jpg as poster (small, already 200KB) — no change

// 3. Despre figure replacement (preserve tag + caption inside the figure)
const oldDespre = `      <figure class="despre__media reveal-3d tilt-on-scroll" data-tilt="back">
        <span class="despre__media-tag" aria-hidden="true">Oradea · EST. 2014</span>
        <img src="assets/img/afara/afara-noapte.png" alt="Fațada Palazzo Grand Hall iluminată la apus" loading="lazy">
        <figcaption class="despre__media-caption" aria-hidden="true">Strada Ciheiului 67</figcaption>
      </figure>`;
const newDespre = `      <figure class="despre__media media-blur reveal-3d tilt-on-scroll" data-tilt="back" style="--lqip:url('${require('../assets/img-opt/manifest.json')['assets/img/afara/afara-noapte.png'].lqip}')">
        <span class="media-blur__ph" aria-hidden="true"></span>
        <span class="despre__media-tag" aria-hidden="true">Oradea · EST. 2014</span>
        <img src="assets/img-opt/afara/afara-noapte-960.webp" srcset="assets/img-opt/afara/afara-noapte-480.webp 480w, assets/img-opt/afara/afara-noapte-960.webp 960w, assets/img-opt/afara/afara-noapte-1600.webp 1600w" sizes="(min-width:1024px) 45vw, 100vw" width="2048" height="1151" alt="Fațada Palazzo Grand Hall iluminată la apus" loading="lazy" decoding="async">
        <figcaption class="despre__media-caption" aria-hidden="true">Strada Ciheiului 67</figcaption>
      </figure>`;
must(oldDespre, newDespre, 'despre figure');

// 4. Split: hall-grand
const M = require('../assets/img-opt/manifest.json');

const oldHall = `      <div class="split__media reveal-3d">
        <img src="assets/img/hall-grand.jpg" alt="Salonul principal Palazzo cu plafon de vitralii și mese rotunde aranjate festiv" loading="lazy" width="1080" height="685">
      </div>`;
const newHall = `      <div class="split__media media-blur reveal-3d" style="--lqip:url('${M['assets/img/hall-grand.jpg'].lqip}')">
        <span class="media-blur__ph" aria-hidden="true"></span>
        <img src="assets/img-opt/hall-grand-960.webp" srcset="assets/img-opt/hall-grand-480.webp 480w, assets/img-opt/hall-grand-960.webp 960w, assets/img-opt/hall-grand-1600.webp 1600w" sizes="(min-width:1024px) 50vw, 100vw" width="${M['assets/img/hall-grand.jpg'].w}" height="${M['assets/img/hall-grand.jpg'].h}" alt="Salonul principal Palazzo cu plafon de vitralii și mese rotunde aranjate festiv" loading="lazy" decoding="async" fetchpriority="high">
      </div>`;
must(oldHall, newHall, 'split hall-grand');

// 5. Split: bar
const oldBar = `      <div class="split__media reveal-3d">
        <img src="assets/img/bar.webp" alt="Bar central Palazzo cu copac decorativ, lumini suspendate și ferestre arcuite" loading="lazy" width="1080" height="685">
      </div>`;
const newBar = `      <div class="split__media media-blur reveal-3d" style="--lqip:url('${M['assets/img/bar.webp'].lqip}')">
        <span class="media-blur__ph" aria-hidden="true"></span>
        <img src="assets/img-opt/bar-960.webp" srcset="assets/img-opt/bar-480.webp 480w, assets/img-opt/bar-960.webp 960w, assets/img-opt/bar-1600.webp 1600w" sizes="(min-width:1024px) 50vw, 100vw" width="${M['assets/img/bar.webp'].w}" height="${M['assets/img/bar.webp'].h}" alt="Bar central Palazzo cu copac decorativ, lumini suspendate și ferestre arcuite" loading="lazy" decoding="async">
      </div>`;
must(oldBar, newBar, 'split bar');

// 6. Galleries: replace whole figure-by-figure
const ALT_BY = { sala: 'Sala Palazzo', mancare: 'Bucătăria Palazzo', afara: 'Exterior Palazzo' };
const CAP_BY = {
  'afara/afara-noapte.png': 'Palazzo noaptea',
};

function buildFigure(folder, file) {
  const src = `assets/img/${folder}/${file}`;
  const e = M[src];
  const alt = ALT_BY[folder];
  const cap = CAP_BY[`${folder}/${file}`] || alt;
  return `      <figure data-lightbox data-lightbox-full="${e.src.full}" data-caption="${cap}" class="media-blur" style="--lqip:url('${e.lqip}')">
        <span class="media-blur__ph" aria-hidden="true"></span>
        <img src="${e.src['480']}" srcset="${e.src['480']} 480w, ${e.src['960']} 960w, ${e.src['1600']} 1600w" sizes="(min-width:1024px) 33vw, (min-width:600px) 50vw, 100vw" width="${e.w}" height="${e.h}" alt="${alt}" loading="lazy" decoding="async">
      </figure>`;
}

function replaceGallery(folder, files, label) {
  // Build regex: between the `<div class="masonry-gallery reveal-3d" data-delay="1">` and `</div>` inside the specific section
  // We'll target the exact original figure lines.
  files.forEach(f => {
    const oldRe = new RegExp(
      `      <figure data-lightbox data-caption="[^"]+">\\s*<img src="assets/img/${folder}/${f.replace(/\./g, '\\.')}" alt="[^"]+" loading="lazy">\\s*</figure>`,
      'g'
    );
    const newBlock = buildFigure(folder, f);
    if (!oldRe.test(html)) {
      if (html.includes(`assets/img-opt/${folder}/${path.parse(f).name}-`)) return; // already updated
      throw new Error(`[fail] gallery ${folder}/${f}: not found`);
    }
    oldRe.lastIndex = 0;
    html = html.replace(oldRe, newBlock);
  });
  console.log(`[ok]   gallery ${label} (${files.length})`);
}

replaceGallery('sala', ['1.png','2.png','3.png','4.png','6.png','7.png','8.png','9.png','10.png','12.png'], 'sala');
replaceGallery('mancare', [
  '1836912593872236.png','1836912607205568.png','1871442953752533.png','1971184093778418.png',
  '1985123889051105.png','1990571208506373.png','2015308459365981.png','2015308526032641.png',
  '2015308562699304.png','2015308596032634.png','2048861656010661.png',
], 'mancare');
replaceGallery('afara', [
  'afara-1.png','afara-2.png','afara-noapte.png','afar3.png','1808334500063379.png',
  '1808334510063378.png','1839115243651971.png','1868330867397075.png','1977789059784588.png',
], 'afara');

fs.writeFileSync(file, html);
console.log('index.html updated.');
