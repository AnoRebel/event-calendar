<script setup lang="ts">
import { nuxtConfigSnippet, vueWrapperSnippet, usageSnippet } from "@/lib/docs-snippets"

useHead({ title: "Install & usage" })

const REGISTRY = "https://event-calendar.anorebel.net/r"

const tiers = [
  {
    name: "Calendar UI",
    tag: "core · no backend",
    accent: "text-sky-600 dark:text-sky-400 border-sky-500/40",
    bar: "bg-sky-500",
    desc: "The views, event modal, drag-and-drop, resize, timezones and statuses. A controlled component — pass events in and handle add/update/delete emits. Bring your own data.",
    item: "event-calendar",
    deps: "date-fns, @vue-dnd-kit/core, reka-ui, @tanstack/vue-form, lucide-vue-next, uuid, @internationalized/date, @vueuse/core, vue-sonner",
  },
  {
    name: "+ Data composable",
    tag: "client",
    accent: "text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
    bar: "bg-emerald-500",
    desc: "A useCalendarData composable that loads and persists events against /api/events, converting ISO ↔ Date. Pairs with the persistence layer.",
    item: "event-calendar-data",
    deps: "Pulls in: Calendar UI",
  },
  {
    name: "+ Persistence",
    tag: "nitro · libsql",
    accent: "text-amber-600 dark:text-amber-400 border-amber-500/40",
    bar: "bg-amber-500",
    desc: "A Nitro server layer: /api/events CRUD backed by libSQL via Drizzle, with a dialect-portable schema, validation and a mapper. Ships single-user with TODO(auth) hooks.",
    item: "event-calendar-persistence",
    deps: "Adds: @libsql/client, drizzle-orm, drizzle-kit · Pulls in: Data composable",
  },
  {
    name: "+ Realtime",
    tag: "crossws",
    accent: "text-violet-600 dark:text-violet-400 border-violet-500/40",
    bar: "bg-violet-500",
    desc: "Live sync between sessions via a Nitro crossws WebSocket, plus a client composable that applies remote edits with auto-reconnect. Installing this installs everything.",
    item: "event-calendar-realtime",
    deps: "Pulls in: Persistence (and everything below it)",
  },
] as const
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 py-10 md:py-14">
    <!-- Top bar -->
    <div class="mb-10 flex items-center justify-between">
      <NuxtLink
        to="/"
        class="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon name="lucide:arrow-left" size="15" />
        Back to calendar
      </NuxtLink>
      <DarkModeToggle />
    </div>

    <!-- Header -->
    <header class="mb-12 border-b border-border pb-10">
      <p class="mb-3 font-mono text-xs uppercase tracking-widest text-primary">shadcn-vue registry</p>
      <h1 class="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">Install &amp; usage</h1>
      <p class="max-w-2xl text-lg text-muted-foreground">
        A configurable, drag-and-drop event calendar for Vue&nbsp;3 &amp; Nuxt. Installed the shadcn way — components
        copied into your project, yours to edit.
      </p>
      <div class="mt-6">
        <InstallTabs :url="`${REGISTRY}/event-calendar.json`" />
      </div>
    </header>

    <!-- Requirements -->
    <section class="mb-14">
      <h2 class="mb-1 font-mono text-xs uppercase tracking-wider text-primary">Before you start</h2>
      <h3 class="mb-4 text-2xl font-semibold tracking-tight">Requirements</h3>
      <p class="mb-3 text-muted-foreground">
        Built on shadcn-vue and Tailwind, so your project needs both configured — that's what lets the copied components
        resolve their <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">@/components/ui/*</code> imports and
        the <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">cn</code> helper.
      </p>
      <ul class="ml-5 list-disc space-y-2 text-muted-foreground">
        <li>A Vue&nbsp;3 or Nuxt&nbsp;4 project with <span class="text-foreground">Tailwind CSS</span>.</li>
        <li>
          <span class="text-foreground">shadcn-vue initialised</span> —
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">npx shadcn-vue@latest init</code> if you haven't.
        </li>
        <li>
          The 15 UI primitives the calendar uses are declared as registry dependencies, so
          <span class="text-foreground">the installer pulls them in automatically</span>.
        </li>
        <li>
          The calendar installs to
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">components/ui/event-calendar/</code>
          (a peer of the primitives), keeping its
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">composables/</code> intact. Import it via
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">@/components/ui/event-calendar/EventCalendar.vue</code>
          — make sure your <span class="text-foreground"><code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">@/</code> alias</span>
          resolves to that folder (Vite writes it under
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">src/</code>; Nuxt auto-imports the project-root
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">components/</code>).
        </li>
      </ul>
    </section>

    <!-- Tiers -->
    <section class="mb-14">
      <h2 class="mb-1 font-mono text-xs uppercase tracking-wider text-primary">Modular by design</h2>
      <h3 class="mb-4 text-2xl font-semibold tracking-tight">Choose what to install</h3>
      <p class="mb-6 text-muted-foreground">
        The UI is standalone and needs no backend. Persistence and realtime are optional layers — each pulls the one
        before it, so a lower tier installs everything above it.
      </p>

      <div class="space-y-3">
        <article
          v-for="t in tiers"
          :key="t.item"
          class="relative overflow-hidden rounded-xl border border-border bg-card p-5"
        >
          <span class="absolute inset-y-0 left-0 w-[3px]" :class="t.bar" />
          <div class="mb-1 flex flex-wrap items-baseline gap-3">
            <span class="text-base font-semibold">{{ t.name }}</span>
            <span class="rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide" :class="t.accent">
              {{ t.tag }}
            </span>
          </div>
          <p class="mb-3 max-w-xl text-sm text-muted-foreground">{{ t.desc }}</p>
          <InstallTabs :url="`${REGISTRY}/${t.item}.json`" />
          <p class="mt-3 text-xs text-muted-foreground/80">{{ t.deps }}</p>
        </article>
      </div>
    </section>

    <!-- Setup -->
    <section class="mb-14">
      <h2 class="mb-1 font-mono text-xs uppercase tracking-wider text-primary">Wire it up</h2>
      <h3 class="mb-4 text-2xl font-semibold tracking-tight">Setup</h3>
      <p class="mb-3 text-muted-foreground">
        Drag-and-drop registers through an ancestor provider. Wrap the calendar once, high in your tree, in a
        <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">DnDProvider</code>.
      </p>
      <p class="mb-2 text-sm font-medium">Nuxt — add the module (auto-registers the provider):</p>
      <CodeBlock class="mb-5" lang="ts" :code="nuxtConfigSnippet" />
      <p class="mb-2 text-sm font-medium">Plain Vue — wrap your app manually:</p>
      <CodeBlock lang="vue" :code="vueWrapperSnippet" />
    </section>

    <!-- Usage -->
    <section class="mb-14">
      <h2 class="mb-1 font-mono text-xs uppercase tracking-wider text-primary">The essentials</h2>
      <h3 class="mb-4 text-2xl font-semibold tracking-tight">Basic usage</h3>
      <p class="mb-3 text-muted-foreground">
        The calendar is <span class="text-foreground">controlled</span>: pass events in via the
        <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">events</code> prop and respond to the three emits.
        It never talks to a backend on its own.
      </p>
      <CodeBlock lang="vue" :code="usageSnippet" />
    </section>

    <!-- Reference -->
    <section class="mb-14">
      <h2 class="mb-1 font-mono text-xs uppercase tracking-wider text-primary">Reference</h2>
      <h3 class="mb-4 text-2xl font-semibold tracking-tight">Props, events &amp; slots</h3>
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-muted/60 text-left font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              <th class="px-4 py-2.5 font-semibold">Prop</th>
              <th class="px-4 py-2.5 font-semibold">Type</th>
              <th class="px-4 py-2.5 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr>
              <td class="px-4 py-2.5 align-top font-mono text-primary">events <span class="text-amber-600 dark:text-amber-400">*</span></td>
              <td class="px-4 py-2.5 align-top font-mono text-xs">CalendarEvent[]</td>
              <td class="px-4 py-2.5 align-top text-muted-foreground">Events to render. Never mutated — the calendar emits intents instead.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 align-top font-mono text-primary">initialView</td>
              <td class="px-4 py-2.5 align-top font-mono text-xs">"month" | "week" | "day" | "agenda"</td>
              <td class="px-4 py-2.5 align-top text-muted-foreground">Starting view. Defaults to month.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 align-top font-mono text-primary">features</td>
              <td class="px-4 py-2.5 align-top font-mono text-xs">{ recurringEvents?: boolean }</td>
              <td class="px-4 py-2.5 align-top text-muted-foreground">Feature toggles as a prop — no framework coupling.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 overflow-x-auto rounded-lg border border-border">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-muted/60 text-left font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              <th class="px-4 py-2.5 font-semibold">Emit</th>
              <th class="px-4 py-2.5 font-semibold">Payload</th>
              <th class="px-4 py-2.5 font-semibold">Fires when</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr>
              <td class="px-4 py-2.5 font-mono text-primary">event-add</td>
              <td class="px-4 py-2.5 font-mono text-xs">CalendarEvent</td>
              <td class="px-4 py-2.5 text-muted-foreground">A new event is created.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-primary">event-update</td>
              <td class="px-4 py-2.5 font-mono text-xs">CalendarEvent</td>
              <td class="px-4 py-2.5 text-muted-foreground">An event is edited, dragged, or resized.</td>
            </tr>
            <tr>
              <td class="px-4 py-2.5 font-mono text-primary">event-delete</td>
              <td class="px-4 py-2.5 font-mono text-xs">string (id)</td>
              <td class="px-4 py-2.5 text-muted-foreground">An event is deleted.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-4 text-sm text-muted-foreground">
        Slot <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">#header-actions</code> renders in the toolbar
        next to the view switcher — a place for a theme toggle or your own controls.
      </p>
    </section>

    <!-- Auth -->
    <section class="mb-8">
      <h2 class="mb-1 font-mono text-xs uppercase tracking-wider text-primary">Make it multi-user</h2>
      <h3 class="mb-4 text-2xl font-semibold tracking-tight">Adding auth</h3>
      <p class="mb-3 text-muted-foreground">
        The server layers ship single-user so they run immediately. Where auth belongs, the routes carry explicit
        <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">TODO(auth)</code> markers — resolve the signed-in
        user, set <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">ownerId</code> on create, and reject
        non-owners. The events table already has a nullable
        <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">ownerId</code> column waiting for it.
      </p>
    </section>

    <footer class="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
      <span>Event Calendar · a shadcn-vue registry</span>
      <NuxtLink to="/" class="font-medium text-primary hover:underline">Open the calendar →</NuxtLink>
    </footer>
  </div>
</template>
