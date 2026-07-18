#!/usr/bin/env node
// Generates placeholder PWA icons (no image libraries required — encodes raw
// PNGs by hand via zlib). Produces a simple "indexed list" glyph on a solid
// background: three bars of decreasing length, standing in for the app's
// browse/search/index concept. Swap public/icons/*.png for real artwork
// whenever branding is available; this just keeps the PWA manifest valid.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'icons')

const BG = [124, 58, 237, 255] // violet-600
const FG = [255, 255, 255, 255]

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

function setPixel(rgba, width, x, y, color) {
  if (x < 0 || y < 0 || x >= width) return
  const i = (y * width + x) * 4
  rgba[i] = color[0]
  rgba[i + 1] = color[1]
  rgba[i + 2] = color[2]
  rgba[i + 3] = color[3]
}

function fillRect(rgba, width, x0, y0, w, h, color, radius = 0) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (radius > 0) {
        const cx = x < x0 + radius ? x0 + radius : x >= x0 + w - radius ? x0 + w - radius - 1 : x
        const cy = y < y0 + radius ? y0 + radius : y >= y0 + h - radius ? y0 + h - radius - 1 : y
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy > radius * radius) continue
      }
      setPixel(rgba, width, x, y, color)
    }
  }
}

function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  fillRect(rgba, size, 0, 0, size, size, BG)

  // Safe zone for maskable icons: keep content within the center ~80%.
  const pad = maskable ? Math.round(size * 0.28) : Math.round(size * 0.24)
  const barHeight = Math.round(size * 0.09)
  const gap = Math.round(size * 0.06)
  const radius = Math.round(barHeight * 0.3)
  const widths = [0.72, 0.52, 0.34].map((f) => Math.round((size - pad * 2) * f))
  let y = pad + Math.round(size * 0.06)
  for (const w of widths) {
    fillRect(rgba, size, pad, y, w, barHeight, FG, radius)
    y += barHeight + gap
  }
  return rgba
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'icon-192.png'), encodePng(192, 192, drawIcon(192)))
writeFileSync(join(OUT_DIR, 'icon-512.png'), encodePng(512, 512, drawIcon(512)))
writeFileSync(join(OUT_DIR, 'icon-maskable-512.png'), encodePng(512, 512, drawIcon(512, { maskable: true })))
console.log('[gen-icons] wrote icon-192.png, icon-512.png, icon-maskable-512.png')
