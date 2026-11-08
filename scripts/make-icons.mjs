// Gera os ícones PNG do PWA (sem dependências externas).
// Uso: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const BG_TOP = [15, 23, 42] // #0f172a
const BG_BOTTOM = [23, 35, 61] // #17233d
const GREEN_TOP = [52, 211, 153] // #34d399
const GREEN_BOTTOM = [5, 150, 105] // #059669
const WHITE = [255, 255, 255]

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const out = Buffer.alloc(8 + data.length + 4)
  out.writeUInt32BE(data.length, 0)
  body.copy(out, 4)
  out.writeUInt32BE(crc32(body), 4 + body.length)
  return out
}

function png(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 4 + 1)
    raw[rowStart] = 0
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const lerp = (a, b, t) => a + (b - a) * t
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]

// Ponto dentro de um retângulo arredondado.
function inRoundRect(x, y, left, top, right, bottom, radius) {
  const cx = Math.min(Math.max(x, left + radius), right - radius)
  const cy = Math.min(Math.max(y, top + radius), bottom - radius)
  if (x >= left && x <= right && y >= top && y <= bottom) {
    if (x >= left + radius && x <= right - radius) return true
    if (y >= top + radius && y <= bottom - radius) return true
  }
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
}

// Ponto dentro de uma elipse girada (ângulo em graus).
function inRotatedEllipse(x, y, cx, cy, rx, ry, angleDeg) {
  const a = (-angleDeg * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  const lx = dx * Math.cos(a) - dy * Math.sin(a)
  const ly = dx * Math.sin(a) + dy * Math.cos(a)
  return (lx / rx) ** 2 + (ly / ry) ** 2 <= 1
}

// Desenha a cena em coordenadas de 512x512 e devolve a cor + alpha.
function sample(x, y) {
  // Fundo com leve gradiente vertical.
  let color = mix(BG_TOP, BG_BOTTOM, y / 512)

  // Círculo verde central.
  const dist = Math.hypot(x - 256, y - 256)
  if (dist <= 178) {
    const t = Math.min(1, Math.max(0, (y - 78) / 356))
    color = mix(GREEN_TOP, GREEN_BOTTOM, t)
  }

  // Broto branco: caule + duas folhas.
  const stem = inRoundRect(x, y, 247, 252, 265, 368, 9)
  const leafLeft = inRotatedEllipse(x, y, 204, 296, 64, 31, -38)
  const leafRight = inRotatedEllipse(x, y, 309, 264, 64, 31, 38)
  if (stem || leafLeft || leafRight) color = WHITE

  return color
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const scale = 512 / size
  const samples = 3
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const x = (px + (sx + 0.5) / samples) * scale
          const y = (py + (sy + 0.5) / samples) * scale
          const c = sample(x, y)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const total = samples * samples
      const i = (py * size + px) * 4
      pixels[i] = Math.round(r / total)
      pixels[i + 1] = Math.round(g / total)
      pixels[i + 2] = Math.round(b / total)
      pixels[i + 3] = 255
    }
  }
  return png(size, size, pixels)
}

const alvos = [
  { arquivo: 'icon-192.png', tamanho: 192 },
  { arquivo: 'icon-512.png', tamanho: 512 },
  { arquivo: 'icon-maskable-512.png', tamanho: 512 },
  { arquivo: 'apple-touch-icon.png', tamanho: 180 },
]

for (const { arquivo, tamanho } of alvos) {
  writeFileSync(join(publicDir, arquivo), render(tamanho))
  console.log(`ok ${arquivo} (${tamanho}x${tamanho})`)
}
