<script setup lang="ts">
import { computed, ref } from "vue"
import { useClipboard } from "@vueuse/core"
import { Check, Copy } from "@lucide/vue"

// A package-manager command block for the docs (usable from Markdown as
// `::install-tabs{item="event-calendar"}`). Give it one of:
//   item      a registry item name — `shadcn-vue add <this site>/r/<item>.json`
//   packages  packages to add, e.g. "@libsql/client" (with `dev` for -D)
//   run       a package.json script, e.g. "dev"
// The chosen package manager is shared by every block on the page.
const props = defineProps<{ item?: string; packages?: string; dev?: boolean; run?: string }>()

type ManagerId = "npm" | "pnpm" | "yarn" | "bun"
const managers: ReadonlyArray<{ id: ManagerId; label: string }> = [
  { id: "npm", label: "npm" },
  { id: "pnpm", label: "pnpm" },
  { id: "yarn", label: "yarn" },
  { id: "bun", label: "bun" },
]
const active = useState<ManagerId>("install-pm", () => "bun")
const origin = useRequestURL().origin

const commandFor = (pm: ManagerId): string => {
  if (props.item) {
    const url = `${origin}/r/${props.item}.json`
    const dlx = { npm: "npx", pnpm: "pnpm dlx", yarn: "yarn dlx", bun: "bunx --bun" }[pm]
    return `${dlx} shadcn-vue@latest add ${url}`
  }
  if (props.packages) {
    const add = { npm: "npm install", pnpm: "pnpm add", yarn: "yarn add", bun: "bun add" }[pm]
    return `${add}${props.dev ? " -D" : ""} ${props.packages}`
  }
  const run = { npm: "npm run", pnpm: "pnpm", yarn: "yarn", bun: "bun run" }[pm]
  return `${run} ${props.run ?? ""}`.trim()
}

const command = computed(() => commandFor(active.value))
const { copy, copied, isSupported } = useClipboard({ source: command, copiedDuring: 1500 })

// Arrow keys move between tabs (WAI-ARIA tabs pattern).
const tabs = ref<HTMLButtonElement[]>([])
const onKey = (e: KeyboardEvent, index: number) => {
  const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
  if (!step) return
  e.preventDefault()
  const next = (index + step + managers.length) % managers.length
  active.value = managers[next]!.id
  tabs.value[next]?.focus()
}
</script>

<template>
  <div class="not-prose my-5 overflow-hidden rounded-lg border border-line-subtle bg-surface-raised-1">
    <div role="tablist" aria-label="Package manager" class="flex items-center gap-0.5 border-b border-line-subtle px-1.5 pt-1.5">
      <button
        v-for="(m, i) in managers"
        :key="m.id"
        ref="tabs"
        type="button"
        role="tab"
        :aria-selected="active === m.id"
        :tabindex="active === m.id ? 0 : -1"
        class="relative min-h-8 rounded-t-md px-3 font-mono text-xs transition-colors"
        :class="active === m.id ? 'text-content-primary' : 'text-content-secondary hover:text-content-primary'"
        @click="active = m.id"
        @keydown="onKey($event, i)"
      >
        {{ m.label }}
        <span v-if="active === m.id" class="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand" />
      </button>
    </div>
    <div role="tabpanel" class="flex items-center gap-2 py-2 pr-2 pl-3">
      <code class="min-w-0 flex-1 overflow-x-auto bg-transparent p-0 font-mono text-[0.8125rem] whitespace-nowrap">
        <span class="text-content-tertiary select-none">$ </span>{{ command }}
      </code>
      <ClientOnly>
      <button
        v-if="isSupported"
        type="button"
        class="grid size-8 shrink-0 place-items-center rounded-md text-content-secondary transition-colors hover:bg-hover hover:text-content-primary"
        :aria-label="copied ? 'Copied' : 'Copy command'"
        @click="copy(command)"
      >
        <Check v-if="copied" class="size-4 text-success-content" />
        <Copy v-else class="size-4" />
      </button>
      </ClientOnly>
    </div>
  </div>
</template>
