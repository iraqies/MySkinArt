const sharp = require('sharp');
const { join } = require('path');

const GRID_COLS = 9;
const GRID_ROWS = 3;
const TILE_SIZE = 8;
const SKIN_SIZE = 64;

const BASE_SKIN_TEMPLATE = join(__dirname, 'base_skin_template.png');
const MSA_WATERMARK = join(__dirname, 'msa_watermark.png');

const DIGIT_FONT = [
  [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
  [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
  [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  [0b01110, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b01110],
  [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110]
];

const UNDERLINE = 0b11111;
const UNDERLINE_COMPACT = 0b111;

const DIGIT_FONT_COMPACT = [
  [0b111, 0b101, 0b101, 0b101, 0b101, 0b101, 0b111],
  [0b010, 0b110, 0b010, 0b010, 0b010, 0b010, 0b111],
  [0b111, 0b001, 0b001, 0b111, 0b100, 0b100, 0b111],
  [0b111, 0b001, 0b001, 0b111, 0b001, 0b001, 0b111],
  [0b001, 0b011, 0b101, 0b101, 0b111, 0b001, 0b001],
  [0b111, 0b100, 0b111, 0b001, 0b001, 0b101, 0b011],
  [0b011, 0b100, 0b111, 0b101, 0b101, 0b101, 0b011],
  [0b111, 0b001, 0b010, 0b010, 0b100, 0b100, 0b100],
  [0b111, 0b101, 0b101, 0b111, 0b101, 0b101, 0b111],
  [0b111, 0b101, 0b101, 0b111, 0b001, 0b001, 0b111]
];

function tileNumber(col, row) {
  return 27 - (row * 9 + col);
}

async function splitImage(inputPath, outputDir) {
  let input = sharp(inputPath);
  const meta = await input.metadata();
  if (meta.width !== 72 || meta.height !== 24) {
    input = input.resize(72, 24, { fit: 'fill', kernel: sharp.kernel.nearest });
  }

  const tiles = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      tiles.push({ num: tileNumber(col, row), x: col * 8, y: row * 8, row, col });
    }
  }
  tiles.sort((a, b) => a.num - b.num);

  const tileBuffers = new Map();
  for (const t of tiles) {
    const buf = await input.clone().extract({ left: t.x, top: t.y, width: 8, height: 8 }).ensureAlpha().raw().toBuffer();
    tileBuffers.set(t.num, buf);
  }

  return { tiles, tileBuffers };
}

function digitOverlay(num) {
  const W = 64, H = 64;
  const pixels = Buffer.alloc(W * H * 4, 0);
  const digits = String(num).split('').map(Number);

  const font = DIGIT_FONT_COMPACT;
  const underline = UNDERLINE_COMPACT;
  const digitW = 3;
  const bitW = 3;
  const gap = 1;
  const totalW = digits.length * digitW + (digits.length - 1) * gap;
  const torsoX = 20, torsoW = 8;
  const startX = torsoX + Math.floor((torsoW - totalW) / 2);
  const startY = 22;

  for (let d = 0; d < digits.length; d++) {
    const glyph = font[digits[d]];
    if (!glyph) continue;
    const ox = startX + d * (digitW + gap);

    for (let row = 0; row < 7; row++) {
      let bits;
      if (row === 6) {
        bits = underline;
      } else {
        bits = glyph[row];
      }

      for (let col = 0; col < digitW; col++) {
        const bit = (bits >> (bitW - 1 - col)) & 1;
        if (bit) {
          const px = ox + col;
          const py = startY + row;
          if (px < W && py < H) {
            const off = (py * W + px) * 4;
            pixels[off] = 255;
            pixels[off + 1] = 255;
            pixels[off + 2] = 255;
            pixels[off + 3] = 255;
          }
        }
      }
    }
  }

  return pixels;
}

async function generateSkin(num, tileBuffer, baseSkinPath) {
  const skinSource = baseSkinPath || BASE_SKIN_TEMPLATE;

  try {
    const base = await sharp(skinSource).ensureAlpha().resize(64, 64, { kernel: sharp.kernel.nearest }).raw().toBuffer();

    const skinBuf = Buffer.from(base);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const srcOff = (y * 64 + x + 40) * 4;
        skinBuf[srcOff] = 0;
        skinBuf[srcOff + 1] = 0;
        skinBuf[srcOff + 2] = 0;
        skinBuf[srcOff + 3] = 0;
      }
    }

    const withBase = sharp(skinBuf, { raw: { width: 64, height: 64, channels: 4 } });
    const numRaw = digitOverlay(num);
    const msaBuf = await sharp(MSA_WATERMARK).ensureAlpha().resize(64, 64, { kernel: sharp.kernel.nearest }).raw().toBuffer();

    const finalBuf = await withBase.composite([
      { input: tileBuffer, raw: { width: 8, height: 8, channels: 4 }, top: 8, left: 8 },
      { input: numRaw, raw: { width: 64, height: 64, channels: 4 }, top: 0, left: 0 },
      { input: msaBuf, raw: { width: 64, height: 64, channels: 4 }, top: 0, left: 0 }
    ]).png().toBuffer();

    return finalBuf;
  } catch (e) {
    console.error('Base skin error:', e.message);
    const emptyLayer = Buffer.alloc(64 * 64 * 4, 0);
    const numRaw = digitOverlay(num);
    const msaBuf = await sharp(MSA_WATERMARK).ensureAlpha().resize(64, 64, { kernel: sharp.kernel.nearest }).raw().toBuffer();
    return sharp(emptyLayer, { raw: { width: 64, height: 64, channels: 4 } })
      .composite([
        { input: tileBuffer, raw: { width: 8, height: 8, channels: 4 }, top: 8, left: 8 },
        { input: numRaw, raw: { width: 64, height: 64, channels: 4 }, top: 0, left: 0 },
        { input: msaBuf, raw: { width: 64, height: 64, channels: 4 }, top: 0, left: 0 }
      ])
      .png()
      .toBuffer();
  }
}

async function generateAll(inputPath, outputDir, baseSkinPath) {
  const { tileBuffers } = await splitImage(inputPath, outputDir);

  const generated = [];
  for (let num = 1; num <= 26; num++) {
    const buf = tileBuffers.get(num);
    const skinPng = await generateSkin(num, buf, baseSkinPath);
    const fname = `skin_${num}.png`;
    const outPath = join(outputDir, fname);
    await sharp(skinPng).png().toFile(outPath);
    generated.push({ num, path: outPath });
  }

  return generated;
}

module.exports = { splitImage, generateSkin, generateAll, tileNumber };
