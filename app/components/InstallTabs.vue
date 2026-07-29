<script setup lang="ts">
import { computed } from "vue"
import { useClipboard } from "@vueuse/core"

// A tabbed install-command block. Pass the shadcn-vue registry item URL (the
// `.json`) and it renders one command per package manager, the way the
// shadcn/reka-ui docs do. The chosen package manager is shared across every
// InstallTabs on the page via useState, so picking "pnpm" once updates them all.
const props = defineProps<{ url: string }>()

type ManagerId = "npm" | "yarn" | "pnpm" | "bun" | "deno"

interface Manager {
  id: ManagerId
  label: string
  // How each package manager runs a one-off CLI (shadcn-vue) plus its args.
  build: (rest: string) => string
}

// `rest` is everything after the executable — "shadcn-vue@latest add <url>".
const managers: readonly Manager[] = [
  { id: "npm", label: "npm", build: (r) => `npx ${r}` },
  { id: "yarn", label: "yarn", build: (r) => `yarn dlx ${r}` },
  { id: "pnpm", label: "pnpm", build: (r) => `pnpm dlx ${r}` },
  { id: "bun", label: "bun", build: (r) => `bunx --bun ${r}` },
  { id: "deno", label: "deno", build: (r) => `deno run -A npm:${r}` },
] as const

// Shared across the page. SSR-safe default.
const active = useState<ManagerId>("install-pm", () => "npm")

const command = computed<string>(() => {
  const m = managers.find((x) => x.id === active.value) ?? managers[0]!
  return m.build(`shadcn-vue@latest add ${props.url}`)
})

const { copy, copied, isSupported } = useClipboard({ source: command })
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-border bg-muted/60">
    <!-- Tab strip -->
    <div
      role="tablist"
      aria-label="Package manager"
      class="flex items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 pt-1.5"
    >
      <button
        v-for="m in managers"
        :key="m.id"
        type="button"
        role="tab"
        :aria-selected="active === m.id"
        :tabindex="active === m.id ? 0 : -1"
        class="relative rounded-t-md px-3 py-1.5 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="
          active === m.id
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="active = m.id"
      >
        {{ m.label }}
        <span
          v-if="active === m.id"
          class="absolute inset-x-1 -bottom-px h-px bg-primary"
        />
      </button>
    </div>

    <!-- Command row -->
    <div class="flex items-center gap-2 px-3 py-2.5">
      <code class="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px]">
        <span class="select-none text-muted-foreground/70">$ </span>{{ command }}
      </code>
      <button
        v-if="isSupported"
        type="button"
        class="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :aria-label="copied ? 'Copied' : 'Copy command'"
        @click="copy(command)"
      >
        <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" size="14" :class="copied ? 'text-emerald-500' : ''" />
      </button>
    </div>
  </div>
</template>
