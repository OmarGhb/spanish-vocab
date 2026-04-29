// Generates public/favicon.ico (32×32) and public/apple-touch-icon.png (180×180)
// for the Paco rebrand. Run once: npx tsx scripts/generate-icons.ts

import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

// oklch(0.55 0.15 20) → #8B3535 (accent / burgundy)
// oklch(0.97 0.02 60) → #FAF8F5 (page / cream)
const ACCENT = '#8B3535'
const BG = '#FAF8F5'

function iconSvg(size: number): Buffer {
  const r = Math.round(size * 0.16)
  const fontSize = Math.round(size * 0.62)
  // Shift text baseline down slightly so the P sits centred inside the rounded square
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${BG}"/>
  <text
    x="50%" y="53%"
    font-family="Georgia, serif"
    font-weight="bold"
    font-size="${fontSize}"
    fill="${ACCENT}"
    text-anchor="middle"
    dominant-baseline="middle"
  >P</text>
</svg>`
  return Buffer.from(svg)
}

function buildIco(png32: Buffer): Buffer {
  // Minimal ICO wrapping a single 32×32 PNG image.
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type = 1 (icon)
  header.writeUInt16LE(1, 4)   // count = 1 image

  const dirEntry = Buffer.alloc(16)
  dirEntry.writeUInt8(32, 0)              // width
  dirEntry.writeUInt8(32, 1)              // height
  dirEntry.writeUInt8(0, 2)              // color count (0 = no palette)
  dirEntry.writeUInt8(0, 3)              // reserved
  dirEntry.writeUInt16LE(1, 4)           // planes
  dirEntry.writeUInt16LE(32, 6)          // bit count
  dirEntry.writeUInt32LE(png32.length, 8) // size of image data
  dirEntry.writeUInt32LE(22, 12)          // offset = header (6) + dirEntry (16)

  return Buffer.concat([header, dirEntry, png32])
}

async function main() {
  const publicDir = path.join(process.cwd(), 'public')

  // 180×180 PNG for Apple touch icon
  const png180 = await sharp(iconSvg(180)).resize(180, 180).png().toBuffer()
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180)
  console.log('✓ public/apple-touch-icon.png (180×180)')

  // 32×32 PNG wrapped in ICO container for favicon
  const png32 = await sharp(iconSvg(32)).resize(32, 32).png().toBuffer()
  const ico = buildIco(png32)
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico)
  console.log('✓ public/favicon.ico (32×32)')
}

void main().catch((e) => { console.error(e); process.exit(1) })
