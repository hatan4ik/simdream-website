// Renders the installable-app icons from the one brand mark (AGENTS.md §1):
//   app/apple-icon.png          180×180 opaque  — iOS Home Screen (iOS composites
//                                                 transparency on black and masks the corners itself)
//   public/icons/icon-192.png   192×192 opaque  — manifest, purpose "any"
//   public/icons/icon-512.png   512×512 opaque  — manifest, purpose "any"
//   public/icons/maskable-512.png 512×512       — manifest, purpose "maskable" (Android safe zone)
// The tile is the Cockpit Night page background so the icon, splash and first paint agree.
//
//   node scripts/generate-app-icons.mjs
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SOURCE = 'public/brand/simdream-plane.png';
const TILE = '#070b14';

async function tile(size, planeRatio, out) {
  const plane = Math.round(size * planeRatio);
  const mark = await sharp(SOURCE).resize(plane, plane, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: TILE } })
    .composite([{ input: mark, gravity: 'centre' }])
    // Compositing re-adds an alpha channel; iOS composites any transparency on black.
    .flatten({ background: TILE })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`${out}  ${size}×${size}`);
}

await mkdir('public/icons', { recursive: true });
await tile(180, 0.74, 'app/apple-icon.png');
await tile(192, 0.74, 'public/icons/icon-192.png');
await tile(512, 0.74, 'public/icons/icon-512.png');
// Maskable icons are cropped to a circle/squircle: keep the mark inside the central 80% safe zone.
await tile(512, 0.56, 'public/icons/maskable-512.png');
