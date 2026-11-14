const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Create Beautiful SVG Icon
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B384A" />
      <stop offset="50%" stop-color="#702C3B" />
      <stop offset="100%" stop-color="#421923" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect x="24" y="24" width="464" height="464" rx="104" fill="url(#bgGrad)" filter="url(#shadow)" />
  
  <!-- Outer Gold Border -->
  <rect x="24" y="24" width="464" height="464" rx="104" fill="none" stroke="#F0E4E7" stroke-width="8" opacity="0.4" />
  
  <!-- Subtle Inner Ring -->
  <circle cx="256" cy="256" r="180" fill="none" stroke="#F0E4E7" stroke-width="2" opacity="0.2" stroke-dasharray="8 8" />

  <!-- White Central Character "أ" for ORGANA / مارجرجس -->
  <text x="256" y="325" 
        font-family="system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif" 
        font-size="220" 
        font-weight="900" 
        fill="#FFFFFF" 
        text-anchor="middle"
        letter-spacing="-4">
    أ
  </text>

  <!-- Small Subtitle ORGANA -->
  <text x="256" y="420" 
        font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" 
        font-size="34" 
        font-weight="800" 
        fill="#F0E4E7" 
        text-anchor="middle"
        letter-spacing="6"
        opacity="0.9">
    ORGANA
  </text>
</svg>`;

fs.writeFileSync(path.join(outDir, 'icon.svg'), svgIcon, 'utf8');
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), svgIcon, 'utf8');

// Function to generate pure valid RGBA PNG binary file with zlib
function generatePng(size, fileName) {
  const width = size;
  const height = size;

  // CRC32 implementation
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const combined = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(combined), 0);

    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Draw pixel data (Burgundy rounded square with subtle border & white glyph representation)
  // Each scanline: 1 byte filter type (0 = none) + width * 4 bytes (RGBA)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let pos = 0;

  const bgR = 112, bgG = 44, bgB = 59; // #702C3B
  const darkR = 66, darkG = 25, darkB = 35; // #421923
  const lightR = 240, lightG = 228, lightB = 231; // #F0E4E7
  const cornerRadius = size * 0.22;

  for (let y = 0; y < height; y++) {
    rawData[pos++] = 0; // Filter: None
    const dy = Math.abs(y - height / 2);

    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x - width / 2);

      // Rounded rect mask
      const maxW = width / 2 - 2;
      const maxH = height / 2 - 2;
      const cornerDx = dx - (maxW - cornerRadius);
      const cornerDy = dy - (maxH - cornerRadius);

      let inside = false;
      if (cornerDx <= 0 || cornerDy <= 0) {
        inside = dx <= maxW && dy <= maxH;
      } else {
        inside = (cornerDx * cornerDx + cornerDy * cornerDy) <= (cornerRadius * cornerRadius);
      }

      if (!inside) {
        // Transparent
        rawData[pos++] = 0;
        rawData[pos++] = 0;
        rawData[pos++] = 0;
        rawData[pos++] = 0;
        continue;
      }

      // Border check (2px)
      const isBorder = (dx > maxW - 4 || dy > maxH - 4);

      // Draw stylized "أ" (alef with hamza) in center
      // Vertical stroke of Alef: x around 50%, y from 35% to 75%
      const cx = width / 2;
      const cy = height / 2;
      const isAlefStem = Math.abs(x - cx) <= size * 0.055 && y >= size * 0.38 && y <= size * 0.76;
      
      // Hamza on top: small curve around y: 22% to 32%
      const hamzaDist = Math.hypot(x - cx, y - (size * 0.26));
      const isHamza = hamzaDist <= size * 0.09 && hamzaDist >= size * 0.03 && (y <= size * 0.28 || x >= cx);

      if (isAlefStem || isHamza) {
        // White symbol
        rawData[pos++] = 255;
        rawData[pos++] = 255;
        rawData[pos++] = 255;
        rawData[pos++] = 255;
      } else if (isBorder) {
        // Gold border
        rawData[pos++] = lightR;
        rawData[pos++] = lightG;
        rawData[pos++] = lightB;
        rawData[pos++] = 180;
      } else {
        // Gradient Burgundy background
        const gradT = y / height;
        rawData[pos++] = Math.round(bgR * (1 - gradT * 0.3) + darkR * (gradT * 0.3));
        rawData[pos++] = Math.round(bgG * (1 - gradT * 0.3) + darkG * (gradT * 0.3));
        rawData[pos++] = Math.round(bgB * (1 - gradT * 0.3) + darkB * (gradT * 0.3));
        rawData[pos++] = 255;
      }
    }
  }

  // Compress with zlib
  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(path.join(outDir, fileName), pngBuffer);
  console.log(`Generated ${fileName} (${size}x${size}, ${pngBuffer.length} bytes)`);
}

generatePng(192, 'icon-192x192.png');
generatePng(512, 'icon-512x512.png');
generatePng(180, 'apple-touch-icon.png');
generatePng(48, 'favicon.png');

console.log('PWA Icons Generated Successfully!');
