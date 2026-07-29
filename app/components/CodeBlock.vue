<script setup lang="ts">
import { ref, watch } from "vue"
import { codeToHtml, type BundledLanguage } from "shiki"

// Syntax-highlighted code block. Highlights with Shiki at render time (SSR, so
// the highlighted markup is in the prerendered HTML — no client-side flash) and
// emits dual light/dark themes as CSS variables, so it follows the site's theme
// toggle without re-highlighting on the client.

// Narrow to the grammars this page actually uses. Each is a member of Shiki's
// BundledLanguage union, so codeToHtml accepts it without a cast.
type SupportedLang = Extract<BundledLanguage, "vue" | "ts" | "bash" | "json">

const props = withDefaults(
  defineProps<{
    code: string
    lang?: SupportedLang
  }>(),
  { lang: "vue" },
)

const html = ref<string>("")

const render = async (): Promise<void> => {
  html.value = await codeToHtml(props.code.trim(), {
    lang: props.lang,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false, // emit CSS vars for both themes; .dark toggles them
  })
}

// Highlight on the server so the markup ships in the payload.
await render()
watch<[string, SupportedLang]>(() => [props.code, props.lang], render)
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="shiki-block overflow-x-auto rounded-lg border border-border bg-muted/60 p-4 text-[13px] leading-relaxed" v-html="html" />
</template>

<style>
/* Shiki emits both palettes as CSS variables; switch them with the theme class. */
.shiki-block .shiki,
.shiki-block .shiki span {
  color: var(--shiki-light);
  background-color: transparent;
}
.dark .shiki-block .shiki,
.dark .shiki-block .shiki span {
  color: var(--shiki-dark);
}
.shiki-block pre.shiki {
  margin: 0;
  background: transparent !important;
  font-family: inherit;
}
.shiki-block code {
  font-family: inherit;
}
</style>
