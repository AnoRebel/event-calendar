<script setup lang="ts">
import { computed, ref } from "vue"
import { Check, MonitorSmartphone, RotateCcw } from "lucide-vue-next"
import { toast } from "vue-sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  DENSITY_OPTIONS,
  MATERIAL_OPTIONS,
  PLATFORM_OPTIONS,
  THEME_OPTIONS,
  type Density,
  type Material,
  type Platform,
  type ThemePreference,
} from "~/composables/useAppearance"

const open = defineModel<boolean>("open", { default: false })

const appearance = useAppearance()
const {
  material,
  platform,
  themePreference,
  density,
  frost,
  rim,
  refraction,
  reducedTransparency,
  refractionAvailable,
  hasGlass,
} = appearance

const platformNote = ref("")

const matchDevice = () => {
  const detected = appearance.matchDevicePlatform()
  const label = PLATFORM_OPTIONS.find(p => p.value === detected)?.label ?? detected
  platformNote.value = `Matched this device: ${label}.`
}

const refractionNote = computed(() => {
  if (!refractionAvailable.value) return "Live refraction needs a Chromium browser; frosted glass is used here."
  if (!hasGlass.value) return "This material has no glass surfaces."
  if (reducedTransparency.value) return "Off while transparency is reduced."
  return "Bends light at the edges of glass bars and sheets."
})

const reset = () => {
  appearance.setMaterial("refraction")
  appearance.setPlatform("web")
  appearance.setTheme("system")
  appearance.setDensity("comfortable")
  appearance.setFrost(true)
  appearance.setRim(true)
  appearance.setRefraction(false)
  appearance.setReducedTransparency(false)
  platformNote.value = ""
  toast.success("Appearance reset")
}

// Short labels keep the segmented controls readable at phone widths.
const themeLabel = (value: ThemePreference, label: string) => (value === "high-contrast" ? "Contrast" : label)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl" data-testid="appearance-dialog">
      <DialogHeader>
        <DialogTitle>Appearance</DialogTitle>
        <DialogDescription>Saved on this device and applied before the page paints.</DialogDescription>
      </DialogHeader>

      <div class="grid min-w-0 gap-6">
        <!-- Material: each swatch renders in its own material. -->
        <fieldset class="grid min-w-0 gap-2">
          <legend class="cn-label mb-2">Material</legend>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label
              v-for="option in MATERIAL_OPTIONS"
              :key="option.value"
              :data-material="option.value"
              class="group relative grid cursor-pointer"
            >
              <input
                type="radio"
                name="appearance-material"
                class="peer sr-only"
                :value="option.value"
                :checked="material === option.value"
                @change="appearance.setMaterial(option.value as Material)"
              >
              <span
                class="grid min-h-24 gap-2 rounded-lg border-[length:var(--border-width-default)] border-line bg-surface-raised-1 p-3 text-left shadow-material-sm transition-colors peer-checked:border-brand peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:outline-[length:var(--focus-ring-width)] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus-ring)] peer-focus-visible:outline-solid"
              >
                <span class="flex items-center gap-1" aria-hidden="true">
                  <span class="size-4 rounded-full border border-line bg-surface-app" />
                  <span class="size-4 rounded-full bg-brand" />
                  <span class="size-4 rounded-full border border-line bg-surface-raised-3" />
                  <Check v-if="material === option.value" class="ml-auto size-4 text-brand-subtle" />
                </span>
                <span class="font-display text-sm font-semibold leading-tight">{{ option.label }}</span>
                <span class="text-xs leading-snug text-content-secondary">{{ option.note }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <div class="grid min-w-0 gap-6 sm:grid-cols-2">
          <div class="grid min-w-0 gap-2">
          <span class="cn-label" aria-hidden="true">Theme</span>
          <fieldset class="cn-segmented cn-segmented--block cn-segmented--size-sm min-w-0">
            <legend>Theme</legend>
            <label v-for="option in THEME_OPTIONS" :key="option.value" class="cn-segmented__item">
              <input
                class="cn-segmented__input"
                type="radio"
                name="appearance-theme"
                :value="option.value"
                :checked="themePreference === option.value"
                @change="appearance.setTheme(option.value as ThemePreference)"
              >
              <span class="cn-segmented__label px-1">{{ themeLabel(option.value, option.label) }}</span>
            </label>
          </fieldset>
          </div>

          <div class="grid min-w-0 gap-2">
          <span class="cn-label" aria-hidden="true">Density</span>
          <fieldset class="cn-segmented cn-segmented--block cn-segmented--size-sm min-w-0">
            <legend>Density</legend>
            <label v-for="option in DENSITY_OPTIONS" :key="option.value" class="cn-segmented__item">
              <input
                class="cn-segmented__input"
                type="radio"
                name="appearance-density"
                :value="option.value"
                :checked="density === option.value"
                @change="appearance.setDensity(option.value as Density)"
              >
              <span class="cn-segmented__label px-1">{{ option.label }}</span>
            </label>
          </fieldset>
          </div>
        </div>

        <div class="grid min-w-0 gap-2">
          <span class="cn-label" aria-hidden="true">Platform style</span>
          <fieldset class="cn-segmented cn-segmented--block cn-segmented--size-sm min-w-0">
            <legend>Platform style</legend>
            <label v-for="option in PLATFORM_OPTIONS" :key="option.value" class="cn-segmented__item">
              <input
                class="cn-segmented__input"
                type="radio"
                name="appearance-platform"
                :value="option.value"
                :checked="platform === option.value"
                @change="appearance.setPlatform(option.value as Platform)"
              >
              <span class="cn-segmented__label px-1">{{ option.label }}</span>
            </label>
          </fieldset>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-content-secondary" aria-live="polite">
              {{ platformNote || "Platform style sets type, control size, corners and focus rings." }}
            </p>
            <Button variant="ghost" size="sm" type="button" @click="matchDevice">
              <MonitorSmartphone /> Match this device
            </Button>
          </div>
        </div>

        <fieldset class="grid min-w-0 gap-1 rounded-lg border border-line-subtle p-3">
          <legend class="cn-label px-1">Glass</legend>
          <div class="flex min-h-touch items-center justify-between gap-4 py-1">
            <label for="appearance-frost" class="grid gap-0.5">
              <span class="text-sm font-medium">Frost</span>
              <span class="text-xs text-content-secondary">Blur what glass covers</span>
            </label>
            <Switch id="appearance-frost" :model-value="frost" :disabled="!hasGlass" @update:model-value="appearance.setFrost($event)" />
          </div>
          <div class="flex min-h-touch items-center justify-between gap-4 py-1">
            <label for="appearance-rim" class="grid gap-0.5">
              <span class="text-sm font-medium">Rim light</span>
              <span class="text-xs text-content-secondary">A specular top edge</span>
            </label>
            <Switch id="appearance-rim" :model-value="rim" :disabled="!hasGlass" @update:model-value="appearance.setRim($event)" />
          </div>
          <div class="flex min-h-touch items-center justify-between gap-4 py-1">
            <label for="appearance-refraction" class="grid gap-0.5">
              <span class="text-sm font-medium">Refraction</span>
              <span class="text-xs text-content-secondary" aria-live="polite">{{ refractionNote }}</span>
            </label>
            <Switch
              id="appearance-refraction"
              :model-value="refraction"
              :disabled="!refractionAvailable || !hasGlass"
              @update:model-value="appearance.setRefraction($event)"
            />
          </div>
          <div class="flex min-h-touch items-center justify-between gap-4 border-t border-line-subtle pt-2">
            <label for="appearance-transparency" class="grid gap-0.5">
              <span class="text-sm font-medium">Reduce transparency</span>
              <span class="text-xs text-content-secondary">Opaque surfaces, no blur or refraction</span>
            </label>
            <Switch
              id="appearance-transparency"
              :model-value="reducedTransparency"
              @update:model-value="appearance.setReducedTransparency($event)"
            />
          </div>
        </fieldset>

        <div class="flex justify-between gap-2">
          <Button variant="ghost" type="button" @click="reset"><RotateCcw /> Reset</Button>
          <Button type="button" @click="open = false">Done</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
