<script setup lang="ts">
const { items, isCurrent } = useAppNavigation()
</script>

<template>
  <!-- Phone navigation: Crystal Neuo's floating glass tab bar. -->
  <nav
    aria-label="Primary"
    class="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    data-testid="tab-bar"
  >
    <div class="cn-tabbar mx-auto max-w-md">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="cn-tabbar__item"
        :aria-current="isCurrent(item) ? 'page' : undefined"
      >
        <component :is="item.icon" class="cn-tabbar__icon" aria-hidden="true" />
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
