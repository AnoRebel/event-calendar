<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { ArrowLeft, ArrowRight, List, Menu } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Documentation pages from content/docs (Nuxt Content), public to everyone.
const route = useRoute()
const path = computed(() => {
  const p = route.path.replace(/\/+$/, "")
  return p === "" ? "/docs" : p
})

const { data: page } = await useAsyncData(`docs-${path.value}`, () => queryCollection("docs").path(path.value).first(), {
  watch: [path],
})
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true })
}

const { data: navigation } = await useAsyncData("docs-navigation", () => queryCollectionNavigation("docs", ["navTitle"]))
const { data: surround } = await useAsyncData(
  `docs-surround-${path.value}`,
  () => queryCollectionItemSurroundings("docs", path.value, { fields: ["title"] }),
  { watch: [path] },
)

// The docs collection is one level deep: /docs (the index) and /docs/<page>.
const links = computed(() => {
  const root = navigation.value?.[0]
  const children = root?.children ?? navigation.value ?? []
  return [root, ...children]
    .filter(Boolean)
    .map(item => ({ path: item!.path, title: (item as { navTitle?: string }).navTitle || item!.title }))
    .filter((item, index, all) => all.findIndex(other => other.path === item.path) === index)
})

const toc = computed(() => page.value?.body?.toc?.links ?? [])
const navOpen = ref(false)
watch(path, () => (navOpen.value = false))

useSeoMeta({
  title: () => page.value?.title,
  description: () => page.value?.description,
})
</script>

<template>
  <div class="mx-auto grid w-full max-w-screen-xl grid-cols-[minmax(0,1fr)] gap-8 px-3 py-6 sm:px-4 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_13rem] lg:py-10">
    <!-- Sidebar (wide screens) -->
    <nav aria-label="Documentation" class="sticky top-24 hidden self-start lg:block">
      <p class="cn-label mb-3 px-3">Documentation</p>
      <ul class="m-0 grid list-none gap-0.5 p-0">
        <li v-for="link in links" :key="link.path">
          <NuxtLink
            :to="link.path"
            class="block rounded-lg px-3 py-1.5 text-sm text-content-secondary no-underline hover:bg-hover hover:text-content-primary aria-[current=page]:bg-brand-soft aria-[current=page]:font-semibold aria-[current=page]:text-content-primary"
            :aria-current="link.path === path ? 'page' : undefined"
          >
            {{ link.title }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <article class="min-w-0">
      <!-- Phones: page menu -->
      <div class="mb-6 flex items-center justify-between gap-2 lg:hidden">
        <Button variant="outline" size="sm" type="button" @click="navOpen = true"><Menu /> Docs menu</Button>
        <span class="truncate text-sm text-content-secondary">{{ page?.navTitle || page?.title }}</span>
      </div>

      <div class="surface-panel p-5 sm:p-8 lg:p-10">
        <p v-if="path !== '/docs'" class="cn-label mb-2">Documentation</p>
        <h1 class="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">{{ page?.title }}</h1>
        <p v-if="page?.description" class="mb-8 text-lg text-content-secondary">{{ page.description }}</p>
        <ContentRenderer v-if="page" :value="page" class="prose-cn" />
      </div>

      <nav aria-label="Previous and next page" class="mt-6 grid gap-3 sm:grid-cols-2">
        <NuxtLink
          v-if="surround?.[0]"
          :to="surround[0].path"
          class="surface-panel flex items-center gap-3 p-4 text-content-primary no-underline hover:border-line"
        >
          <ArrowLeft class="size-4 shrink-0 text-content-secondary" aria-hidden="true" />
          <span class="min-w-0"><span class="block text-xs text-content-secondary">Previous</span><span class="block truncate font-semibold">{{ surround[0].title }}</span></span>
        </NuxtLink>
        <span v-else />
        <NuxtLink
          v-if="surround?.[1]"
          :to="surround[1].path"
          class="surface-panel flex items-center justify-end gap-3 p-4 text-right text-content-primary no-underline hover:border-line"
        >
          <span class="min-w-0"><span class="block text-xs text-content-secondary">Next</span><span class="block truncate font-semibold">{{ surround[1].title }}</span></span>
          <ArrowRight class="size-4 shrink-0 text-content-secondary" aria-hidden="true" />
        </NuxtLink>
      </nav>
    </article>

    <!-- On this page (wide screens) -->
    <aside v-if="toc.length" aria-label="On this page" class="sticky top-24 hidden self-start xl:block">
      <p class="cn-label mb-3 flex items-center gap-1.5"><List class="size-3.5" aria-hidden="true" /> On this page</p>
      <ul class="m-0 grid list-none gap-1 border-l border-line-subtle p-0 pl-3 text-sm">
        <li v-for="link in toc" :key="link.id">
          <a :href="`#${link.id}`" class="text-content-secondary no-underline hover:text-content-primary">{{ link.text }}</a>
          <ul v-if="link.children?.length" class="m-0 mt-1 grid list-none gap-1 p-0 pl-3">
            <li v-for="child in link.children" :key="child.id">
              <a :href="`#${child.id}`" class="text-content-tertiary no-underline hover:text-content-primary">{{ child.text }}</a>
            </li>
          </ul>
        </li>
      </ul>
    </aside>

    <Dialog v-model:open="navOpen">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Documentation</DialogTitle>
          <DialogDescription class="sr-only">Jump to a documentation page</DialogDescription>
        </DialogHeader>
        <ul class="m-0 grid list-none gap-0.5 p-0">
          <li v-for="link in links" :key="link.path">
            <NuxtLink
              :to="link.path"
              class="block min-h-touch rounded-lg px-3 py-2 text-content-secondary no-underline hover:bg-hover aria-[current=page]:bg-brand-soft aria-[current=page]:font-semibold aria-[current=page]:text-content-primary"
              :aria-current="link.path === path ? 'page' : undefined"
            >
              {{ link.title }}
            </NuxtLink>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  </div>
</template>
