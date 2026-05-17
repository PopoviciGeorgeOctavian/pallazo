/*
 * Optimize gallery PNGs into responsive WebP variants + a tiny base64 LQIP.
 * Writes:
 *   - assets/img-opt/<folder>/<name>-<w>.webp   (sizes: 480, 960, 1600)
 *   - assets/img-opt/<folder>/<name>-full.webp  (max 2400px, lightbox)
 *   - assets/img-opt/manifest.json              (LQIP + dims per source path)
 *
 * Re-runnable: skips outputs that are already up to date.
 */
const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT       = path.join(__dirname, '..');
const SRC_DIRS   = ['assets/img/sala', 'assets/img/mancare', 'assets/img/afara'];
const SINGLES    = ['assets/img/hall-grand.jpg', 'assets/img/bar.webp'];
const OUT_BASE   = path.join(ROOT, 'assets/img-opt');
const SIZES      = [480, 960, 1600];
const FULL_MAX   = 2400;
const QUALITY    = { thumb: 76, mid: 80, large: 82, full: 84 };

const ensureDir = p => fs.mkdirSync(p, { recursive: true });
const mtime     = p => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };

const collect = () => {
  const out = [];
  for (const dir of SRC_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      if (/\.(png|jpe?g|webp)$/i.test(f)) out.push(path.join(dir, f).replace(/\\/g, '/'));
    }
  }
  for (const s of SINGLES) if (fs.existsSync(path.join(ROOT, s))) out.push(s);
  return out;
};

(async () => {
  const manifest = {};
  const files = collect();
  console.log(`Optimizing ${files.length} images...`);

  let i = 0;
  for (const rel of files) {
    i++;
    const src = path.join(ROOT, rel);
    const parsed = path.parse(rel);
    const outDir = path.join(OUT_BASE, parsed.dir.replace(/^assets\/img\/?/, ''));
    ensureDir(outDir);
    const name = parsed.name;
    const srcMtime = mtime(src);

    const meta = await sharp(src).metadata();
    const srcW = meta.width || 1600;
    const srcH = meta.height || 1000;

    const variants = {};
    for (const w of SIZES) {
      const target = Math.min(w, srcW);
      const out = path.join(outDir, `${name}-${w}.webp`);
      variants[w] = path.relative(ROOT, out).replace(/\\/g, '/');
      if (mtime(out) > srcMtime) continue;
      const q = w <= 480 ? QUALITY.thumb : w <= 960 ? QUALITY.mid : QUALITY.large;
      await sharp(src)
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: q, effort: 5 })
        .toFile(out);
    }

    // Full-size for lightbox
    const fullTarget = Math.min(FULL_MAX, srcW);
    const fullOut = path.join(outDir, `${name}-full.webp`);
    variants.full = path.relative(ROOT, fullOut).replace(/\\/g, '/');
    if (mtime(fullOut) <= srcMtime) {
      await sharp(src)
        .resize({ width: fullTarget, withoutEnlargement: true })
        .webp({ quality: QUALITY.full, effort: 5 })
        .toFile(fullOut);
    }

    // LQIP: tiny blurred webp inlined as data URI (~ <600B)
    const lqipBuf = await sharp(src)
      .resize({ width: 24 })
      .webp({ quality: 35, effort: 6 })
      .toBuffer();
    const lqip = `data:image/webp;base64,${lqipBuf.toString('base64')}`;

    manifest[rel] = {
      w: srcW,
      h: srcH,
      lqip,
      src: variants,
    };

    if (i % 5 === 0 || i === files.length) console.log(`  ${i}/${files.length} done`);
  }

  ensureDir(OUT_BASE);
  fs.writeFileSync(path.join(OUT_BASE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Wrote manifest with ${Object.keys(manifest).length} entries.`);
})().catch(e => { console.error(e); process.exit(1); });
