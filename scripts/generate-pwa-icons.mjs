#!/usr/bin/env node
/**
 * Genera le icone PNG richieste dal manifest PWA (192×192 e 512×512),
 * senza dipendenze di immagine esterne: costruisce un PNG RGBA a tinta unita
 * (colore crimson del design system) scrivendo direttamente i chunk PNG e
 * comprimendo con `node:zlib` (built-in).
 *
 * Sono icone segnaposto valide dal punto di vista del formato: per la
 * pubblicazione reale si consiglia di sostituirle con un artwork disegnato
 * (es. il monogramma "M" in Cormorant Garamond su fondo crimson), mantenendo
 * le stesse dimensioni e lo stesso percorso file.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

// Colore crimson del design system (§23): hsl(350 62% 42%) ≈ #a3293c
const R = 0xa3;
const G = 0x29;
const B = 0x3c;
const A = 0xff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function buildSolidPng(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type: RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Un cerchio "M" stilizzato sarebbe complesso senza libreria grafica:
  // qui si disegna un quadrato pieno con un margine più chiaro (bordo),
  // sufficiente come icona PWA segnaposto riconoscibile.
  const rowSize = size * 4 + 1; // +1 per il filter byte
  const raw = Buffer.alloc(rowSize * size);
  const margin = Math.round(size * 0.12);
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      const isBorder = x < margin || y < margin || x >= size - margin || y >= size - margin;
      if (isBorder) {
        raw[px] = 0xf5;
        raw[px + 1] = 0xef;
        raw[px + 2] = 0xe3;
        raw[px + 3] = A;
      } else {
        raw[px] = R;
        raw[px + 1] = G;
        raw[px + 2] = B;
        raw[px + 3] = A;
      }
    }
  }

  const idat = deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const png = buildSolidPng(size);
  const filePath = path.join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(filePath, png);
  console.log(`Generata ${filePath} (${png.length} byte)`);
}
