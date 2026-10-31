#!/usr/bin/env bun
/**
 * Copies Crystal Neuo's build output into this app.
 *
 * Crystal Neuo is not published to npm, so the app vendors its compiled tokens,
 * base and component CSS and the framework-free runtime. To upgrade:
 *
 *   git clone https://github.com/AnoRebel/crystal-neuo ../crystal-neuo
 *   (cd ../crystal-neuo && bun install && bun run build:tokens)
 *   CRYSTAL_NEUO_DIR=../crystal-neuo bun run design:sync
 */
import { execSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const src = resolve(process.env.CRYSTAL_NEUO_DIR || "../crystal-neuo")
const cssOut = resolve("app/assets/crystal-neuo")
const runtimeOut = resolve("app/lib/crystal-neuo")

const tokensCss = join(src, "packages/tokens/dist/tokens.css")
const runtimeDir = join(src, "packages/tokens/dist/runtime")
if (!existsSync(tokensCss) || !existsSync(runtimeDir)) {
  console.error(`✗ No Crystal Neuo build found in ${src}. Run \`bun install && bun run build:tokens\` there first.`)
  process.exit(1)
}

const version = JSON.parse(readFileSync(join(src, "packages/tokens/package.json"), "utf8")).version as string
let commit = "unknown"
try {
  commit = execSync("git rev-parse --short HEAD", { cwd: src }).toString().trim()
} catch {
  // not a git checkout
}
const banner = `/* Crystal Neuo v${version} (${commit}) — vendored by scripts/sync-crystal-neuo.ts. Do not edit. */\n`

mkdirSync(cssOut, { recursive: true })
mkdirSync(runtimeOut, { recursive: true })

const copyWithBanner = (from: string, to: string) => {
  const body = readFileSync(from, "utf8").replace(/^\/\* AUTO-GENERATED[^\n]*\n/, "")
  writeFileSync(to, banner + body)
}

copyWithBanner(tokensCss, join(cssOut, "tokens.css"))
copyWithBanner(join(src, "packages/css/src/base.css"), join(cssOut, "base.css"))
copyWithBanner(join(src, "packages/css/src/components.css"), join(cssOut, "components.css"))

for (const file of readdirSync(runtimeDir)) {
  if (file.endsWith(".js")) copyFileSync(join(runtimeDir, file), join(runtimeOut, file))
  // Declarations are emitted with source-style `./axes.ts` specifiers; point them
  // at the shipped `.js` modules so they resolve outside the Crystal Neuo repo.
  if (file.endsWith(".d.ts")) {
    const dts = readFileSync(join(runtimeDir, file), "utf8")
      .replace(/(from\s+["']\.\/[\w-]+)\.ts(["'])/g, "$1.js$2")
      .replace(/^\/\/# sourceMappingURL=.*$/m, "")
    writeFileSync(join(runtimeOut, file), dts)
  }
}
writeFileSync(join(runtimeOut, "VERSION"), `${version} ${commit}\n`)

console.log(`✓ Synced Crystal Neuo v${version} (${commit}) from ${src}`)
