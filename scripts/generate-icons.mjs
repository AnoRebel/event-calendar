// Renders the PWA icons from public/icon.svg (run after changing the mark):
//   node scripts/generate-icons.mjs
import { readFileSync } from "node:fs"
import sharp from "sharp"

const svg = readFileSync("public/icon.svg")
const background = { r: 238, g: 240, b: 245, alpha: 1 } // Crystal Neuo refraction canvas

const plain = (size, file) => sharp(svg, { density: 512 }).resize(size, size).png().toFile(`public/${file}`)
// Maskable icons keep the mark inside the 80% safe zone on a solid background.
const padded = async (size, file, scale) => {
  const inner = Math.round(size * scale)
  const mark = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(`public/${file}`)
}

await plain(192, "icon-192.png")
await plain(512, "icon-512.png")
await padded(512, "icon-maskable-512.png", 0.62)
await padded(180, "apple-touch-icon.png", 0.78)
console.log("✓ icons written to public/")
