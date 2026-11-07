import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const S = 2048
const OUT = 'public/icons'

const crcTable = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  crcTable[n] = c >>> 0
}

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ]
}

const AMBER_TOP = [251, 191, 36]
const AMBER_BOTTOM = [249, 115, 22]
const RIM = [41, 37, 36]
const PIT = [9, 9, 11]
const CRACK = [28, 25, 23]
const WHITE = [255, 250, 240]
const BG_DARK = [12, 10, 9]

function roundedRect(x, y, size, radius) {
  const cx = clamp(x, radius, size - radius)
  const cy = clamp(y, radius, size - radius)
  return Math.hypot(x - cx, y - cy) <= radius
}

function insideIrregularEllipse(dx, dy, rx, ry, phase = 0) {
  const nx = dx / rx
  const ny = dy / ry
  const a = Math.atan2(ny, nx)
  const wobble = 1 + 0.055 * Math.sin(3 * a + phase) + 0.032 * Math.sin(7 * a + 2.1 + phase)
  return Math.hypot(nx, ny) <= wobble
}

function triangle(px, py, ax, ay, bx, by, cx, cy) {
  const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3)
  const d1 = sign(px, py, ax, ay, bx, by)
  const d2 = sign(px, py, bx, by, cx, cy)
  const d3 = sign(px, py, cx, cy, ax, ay)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const CRACKS = [
  [[0.215, 0.58], [0.14, 0.55], [0.095, 0.6], [0.045, 0.57]],
  [[0.77, 0.55], [0.84, 0.52], [0.89, 0.55], [0.945, 0.5]],
  [[0.62, 0.84], [0.66, 0.9], [0.72, 0.92], [0.75, 0.975]],
  [[0.38, 0.85], [0.35, 0.91], [0.3, 0.94], [0.29, 0.985]]
]

function makeIcon(maskable) {
  const size = S
  const buffer = Buffer.alloc(size * size * 4)
  const contentScale = maskable ? 0.82 : 1
  const radius = size * 0.225

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size
      const v = (y + 0.5) / size
      const ix = (u - 0.5) * contentScale + 0.5
      const iy = (v - 0.5) * contentScale + 0.5

      let color = BG_DARK
      let alpha = 0

      if (maskable || roundedRect(x, y, size, radius)) {
        const t = clamp(v * 0.92 + 0.04, 0, 1)
        color = mix(AMBER_TOP, AMBER_BOTTOM, t)
        const sheen = clamp(1 - Math.hypot(u - 0.24, v - 0.12) / 0.55, 0, 1) * 0.16
        color = mix(color, [255, 240, 200], sheen)
        alpha = 255
      }

      if (alpha > 0 && ix >= 0 && ix <= 1 && iy >= 0 && iy <= 1) {
        for (const crack of CRACKS) {
          let hit = false
          for (let i = 0; i < crack.length - 1; i++) {
            const [ax, ay] = crack[i]
            const [bx, by] = crack[i + 1]
            if (distToSegment(ix, iy, ax, ay, bx, by) < 0.016) hit = true
          }
          if (hit) color = CRACK
        }

        if (insideIrregularEllipse(ix - 0.5, iy - 0.682, 0.335, 0.218, 0)) {
          color = RIM
          if (insideIrregularEllipse(ix - 0.502, iy - 0.69, 0.288, 0.181, 1.4)) {
            color = PIT
          }
        }

        if (
          Math.hypot(ix - 0.225, iy - 0.585) < 0.016 ||
          Math.hypot(ix - 0.765, iy - 0.61) < 0.013 ||
          Math.hypot(ix - 0.62, iy - 0.805) < 0.011
        ) {
          color = [120, 85, 40]
        }

        const pinCircle = Math.hypot(ix - 0.5, iy - 0.365) < 0.118
        const pinTail = triangle(ix, iy, 0.5, 0.6, 0.402, 0.435, 0.598, 0.435)
        if (pinCircle || pinTail) {
          color = WHITE
          if (Math.hypot(ix - 0.5, iy - 0.365) < 0.046) color = AMBER_BOTTOM
        }
      }

      const o = (y * size + x) * 4
      buffer[o] = clamp(Math.round(color[0]), 0, 255)
      buffer[o + 1] = clamp(Math.round(color[1]), 0, 255)
      buffer[o + 2] = clamp(Math.round(color[2]), 0, 255)
      buffer[o + 3] = alpha
    }
  }

  return buffer
}

function downsample(buffer, srcSize, dstSize) {
  const out = Buffer.alloc(dstSize * dstSize * 4)
  for (let y = 0; y < dstSize; y++) {
    const y0 = Math.floor((y * srcSize) / dstSize)
    const y1 = Math.floor(((y + 1) * srcSize) / dstSize)
    for (let x = 0; x < dstSize; x++) {
      const x0 = Math.floor((x * srcSize) / dstSize)
      const x1 = Math.floor(((x + 1) * srcSize) / dstSize)
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const si = (sy * srcSize + sx) * 4
          const av = buffer[si + 3] / 255
          r += buffer[si] * av
          g += buffer[si + 1] * av
          b += buffer[si + 2] * av
          a += av
          n++
        }
      }
      const o = (y * dstSize + x) * 4
      if (a === 0) {
        out[o] = 12
        out[o + 1] = 10
        out[o + 2] = 9
        out[o + 3] = 0
      } else {
        out[o] = Math.round(r / a)
        out[o + 1] = Math.round(g / a)
        out[o + 2] = Math.round(b / a)
        out[o + 3] = Math.round((a / n) * 255)
      }
    }
  }
  return out
}

mkdirSync(OUT, { recursive: true })
const normal = makeIcon(false)
const maskable = makeIcon(true)
writeFileSync(`${OUT}/icon-512.png`, encodePng(512, 512, downsample(normal, S, 512)))
writeFileSync(`${OUT}/icon-192.png`, encodePng(192, 192, downsample(normal, S, 192)))
writeFileSync(
  `${OUT}/icon-maskable-512.png`,
  encodePng(512, 512, downsample(maskable, S, 512))
)
writeFileSync(`${OUT}/icon-1024.png`, encodePng(1024, 1024, downsample(normal, S, 1024)))
console.log('icons generated')
