/*
 * Emit <picture> blocks (one per source image) keyed by the original path.
 * Used as the input for the manual HTML edits.
 */
const fs = require('fs');
const path = require('path');

const manifest = require('../assets/img-opt/manifest.json');

const SIZES_DEFAULT = '(min-width:1024px) 33vw, (min-width:600px) 50vw, 100vw';

function pic({ src, alt, caption, sizes = SIZES_DEFAULT, eager = false, fetchPriority, classes = '', lightbox = true, sizeHint }) {
  const e = manifest[src];
  if (!e) throw new Error('Missing manifest entry for ' + src);
  const v = e.src;
  const srcset = `${v['480']} 480w, ${v['960']} 960w, ${v['1600']} 1600w`;
  const baseSrc = v['960'];
  const lqip = e.lqip;
  const w = e.w, h = e.h;
  const loading = eager ? 'eager' : 'lazy';
  const fp = fetchPriority ? ` fetchpriority="${fetchPriority}"` : '';
  const lbAttr = lightbox ? ` data-lightbox data-lightbox-full="${v.full}" data-caption="${caption || alt}"` : '';
  const cls = `media-blur ${classes}`.trim();
  const sizesAttr = sizeHint || sizes;
  return `<figure${lbAttr ? ' ' + lbAttr.trim() : ''} class="${cls}" style="--lqip:url('${lqip}')">
  <span class="media-blur__ph" aria-hidden="true"></span>
  <img src="${baseSrc}" srcset="${srcset}" sizes="${sizesAttr}" width="${w}" height="${h}" alt="${alt}" loading="${loading}" decoding="async"${fp}>
</figure>`;
}

// Just emit raw <picture>/figure markup for each image we need
const out = {};

// Hero poster img (preload) — we'll inline 960px webp as preload
out.heroPoster = {
  preload: manifest['assets/img/hall-grand.jpg'].src['960'],
  preloadSrcset: `${manifest['assets/img/hall-grand.jpg'].src['480']} 480w, ${manifest['assets/img/hall-grand.jpg'].src['960']} 960w, ${manifest['assets/img/hall-grand.jpg'].src['1600']} 1600w`,
  fallback: 'assets/img/hall-grand.jpg',
};

// Despre image
out.despre = pic({
  src: 'assets/img/afara/afara-noapte.png',
  alt: 'Fațada Palazzo Grand Hall iluminată la apus',
  caption: 'Fațada Palazzo Grand Hall',
  sizeHint: '(min-width:1024px) 50vw, 100vw',
  lightbox: false,
});

// Split sections (salonul)
out.hallGrand = pic({
  src: 'assets/img/hall-grand.jpg',
  alt: 'Salonul principal Palazzo cu plafon de vitralii și mese rotunde aranjate festiv',
  caption: 'Salonul Palazzo',
  sizeHint: '(min-width:1024px) 50vw, 100vw',
  lightbox: false,
});
out.bar = pic({
  src: 'assets/img/bar.webp',
  alt: 'Bar central Palazzo cu copac decorativ, lumini suspendate și ferestre arcuite',
  caption: 'Bar central Palazzo',
  sizeHint: '(min-width:1024px) 50vw, 100vw',
  lightbox: false,
});

// Gallery: sala
const galleries = {
  sala: ['1.png','2.png','3.png','4.png','6.png','7.png','8.png','9.png','10.png','12.png'],
  mancare: [
    '1836912593872236.png','1836912607205568.png','1871442953752533.png','1971184093778418.png',
    '1985123889051105.png','1990571208506373.png','2015308459365981.png','2015308526032641.png',
    '2015308562699304.png','2015308596032634.png','2048861656010661.png'
  ],
  afara: [
    'afara-1.png','afara-2.png','afara-noapte.png','afar3.png','1808334500063379.png',
    '1808334510063378.png','1839115243651971.png','1868330867397075.png','1977789059784588.png'
  ],
};

const ALT_BY = {
  sala: 'Sala Palazzo',
  mancare: 'Bucătăria Palazzo',
  afara: 'Exterior Palazzo',
};

for (const [folder, files] of Object.entries(galleries)) {
  out[folder] = files.map(f => pic({
    src: `assets/img/${folder}/${f}`,
    alt: ALT_BY[folder],
    caption: ALT_BY[folder],
  })).join('\n      ');
}

fs.writeFileSync(path.join(__dirname, 'snippets.json'), JSON.stringify(out, null, 2));
console.log('Wrote snippets.json');
