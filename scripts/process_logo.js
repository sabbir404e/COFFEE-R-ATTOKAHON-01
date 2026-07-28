const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processLogo() {
  const inputPath = path.join(__dirname, '..', 'public', 'hero-logo.png');
  const meta = await sharp(inputPath).metadata();
  const width = meta.width; // 2816
  const height = meta.height; // 1536

  // The badge center is (1408, 765) and diameter ~1410
  const size = 1420;
  const left = Math.round(1408 - size / 2); // 698
  const top = Math.round(765 - size / 2);   // 55

  // SVG mask for clean circular cutout with no background
  const r = size / 2;
  const svgMask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${r}" cy="${r}" r="${r - 4}" fill="#ffffff" />
    </svg>`
  );

  // Crop square around badge
  const cropped = await sharp(inputPath)
    .extract({ left, top, width: size, height: size })
    .toBuffer();

  // Composite with dest-in mask to make everything outside circular badge transparent
  const transparentCircle = await sharp(cropped)
    .composite([{ input: svgMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
  const logoTransparentPath = path.join(__dirname, '..', 'public', 'logo-transparent.png');

  // Save 512x512 logo.png
  await sharp(transparentCircle)
    .resize(512, 512, { fit: 'contain' })
    .toFile(logoPath);

  // Save 1024x1024 logo-transparent.png
  await sharp(transparentCircle)
    .resize(1024, 1024, { fit: 'contain' })
    .toFile(logoTransparentPath);

  console.log('Successfully generated transparent logo.png and logo-transparent.png!');
}

processLogo().catch(err => {
  console.error(err);
  process.exit(1);
});
