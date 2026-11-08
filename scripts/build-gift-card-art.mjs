// Builds the web and email art for the seven digital gift-card designs from the master renders.
//
// The masters are 2752×1536 JPEGs of a card photographed on white, each with a different margin
// and a slightly different card proportion. Showing them as-is forced the preview to crop with a
// hard-coded zoom, which cut the logo on some cards. This script instead:
//   1. finds the white background connected to the picture edge and makes it transparent,
//      with a soft one-pixel edge so the rounded corners sit cleanly on any page colour;
//   2. trims each card to its exact bounds;
//   3. centres it, uncropped, on one common canvas, so every design has the same frame.
//
// Outputs (only these are committed; the masters are not):
//   public/gift-cards/<id>.webp  1280×711 with alpha, for the voucher page preview
//   public/gift-cards/<id>.jpg    960×533 on white, for the activation email (path unchanged,
//                                  so emails already sent keep a working image)
//
//   node scripts/build-gift-card-art.mjs <directory with <id>.jpg masters>
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const IDS = ['skyline', 'ivory', 'moonlight', 'aurora', 'sunset', 'dusk', 'pearl'];
const CANVAS = { width: 1280, height: 711 }; // 1.8 : 1, the widest of the seven cards
const EMAIL = { width: 960, height: 533 };
const PADDING = 0.02; // share of the canvas left clear around the card
const WHITE_FLOOR = 247; // a background pixel has every channel at or above this
const ERODE_PX = 2; // pulls the cut-out inside the card's anti-aliased rim, removing the white fringe

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error('usage: node scripts/build-gift-card-art.mjs <directory with <id>.jpg masters>');
  process.exit(1);
}

/** Marks the near-white pixels reachable from the picture edge (4-connected flood fill). */
function backgroundMask(data, width, height) {
  const isWhite = (index) =>
    data[index * 4] >= WHITE_FLOOR && data[index * 4 + 1] >= WHITE_FLOOR && data[index * 4 + 2] >= WHITE_FLOOR;
  const outside = new Uint8Array(width * height);
  const stack = [];
  const seed = (x, y) => {
    const index = y * width + x;
    if (!outside[index] && isWhite(index)) {
      outside[index] = 1;
      stack.push(index);
    }
  };
  for (let x = 0; x < width; x += 1) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    seed(0, y);
    seed(width - 1, y);
  }
  while (stack.length) {
    const index = stack.pop();
    const x = index % width;
    const y = (index - x) / width;
    if (x > 0) seed(x - 1, y);
    if (x < width - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < height - 1) seed(x, y + 1);
  }
  return outside;
}

/** Keeps only the largest connected opaque region (the card), dropping JPEG specks at the picture edge. */
function largestRegion(opaque, width, height) {
  const label = new Int32Array(opaque.length);
  let best = { id: 0, size: 0 };
  let nextId = 0;
  for (let start = 0; start < opaque.length; start += 1) {
    if (!opaque[start] || label[start]) continue;
    nextId += 1;
    let size = 0;
    const stack = [start];
    label[start] = nextId;
    while (stack.length) {
      const index = stack.pop();
      size += 1;
      const x = index % width;
      const y = (index - x) / width;
      const visit = (neighbour) => {
        if (opaque[neighbour] && !label[neighbour]) {
          label[neighbour] = nextId;
          stack.push(neighbour);
        }
      };
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }
    if (size > best.size) best = { id: nextId, size };
  }
  return Uint8Array.from(label, (value) => (value === best.id ? 1 : 0));
}

/** Shrinks the opaque area by one pixel per pass. */
function erode(opaque, width, height, passes) {
  let current = opaque;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current.length);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        next[index] =
          current[index] && current[index - 1] && current[index + 1] && current[index - width] && current[index + width] ? 1 : 0;
      }
    }
    current = next;
  }
  return current;
}

async function cutOutCard(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const outside = backgroundMask(data, width, height);
  const card = largestRegion(Uint8Array.from(outside, (value) => (value ? 0 : 1)), width, height);
  const opaque = erode(card, width, height, ERODE_PX);

  const alpha = Buffer.alloc(width * height);
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = opaque[index] ? 255 : 0;
  // One soft pixel on the edge; a blur on the 0/255 mask gives a clean anti-aliased rim.
  // sharp returns three identical channels after a blur, so keep just the first.
  const feathered = await sharp(alpha, { raw: { width, height, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  for (let index = 0; index < feathered.length; index += 1) data[index * 4 + 3] = feathered[index];

  // Trim to the card's exact bounds, read from the mask (a pixel counts once it is mostly opaque).
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (feathered[y * width + x] > 127) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .png()
    .toBuffer();
}

async function onCanvas(card, canvas, background) {
  const maxWidth = Math.round(canvas.width * (1 - PADDING * 2));
  const maxHeight = Math.round(canvas.height * (1 - PADDING * 2));
  const fitted = await sharp(card).resize(maxWidth, maxHeight, { fit: 'inside', kernel: 'lanczos3' }).png().toBuffer();
  return sharp({ create: { width: canvas.width, height: canvas.height, channels: 4, background } })
    .composite([{ input: fitted, gravity: 'centre' }])
    .png()
    .toBuffer();
}

await mkdir('public/gift-cards', { recursive: true });
for (const id of IDS) {
  const card = await cutOutCard(join(sourceDir, `${id}.jpg`));
  const cardInfo = await sharp(card).metadata();

  const web = await onCanvas(card, CANVAS, { r: 0, g: 0, b: 0, alpha: 0 });
  await sharp(web).webp({ quality: 82, alphaQuality: 92, effort: 6 }).toFile(`public/gift-cards/${id}.webp`);

  const email = await onCanvas(card, EMAIL, { r: 255, g: 255, b: 255, alpha: 1 });
  await sharp(email).flatten({ background: '#ffffff' }).jpeg({ quality: 86, mozjpeg: true }).toFile(`public/gift-cards/${id}.jpg`);

  console.log(`${id.padEnd(10)} card ${cardInfo.width}×${cardInfo.height} (${(cardInfo.width / cardInfo.height).toFixed(3)})  → ${CANVAS.width}×${CANVAS.height} webp, ${EMAIL.width}×${EMAIL.height} jpg`);
}
