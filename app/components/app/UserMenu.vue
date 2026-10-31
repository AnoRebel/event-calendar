<script setup lang="ts">
import { computed } from "vue"
import { BookOpen, LogOut, Palette, UserRound } from "@lucide/vue"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const emit = defineEmits<{ (e: "appearance"): void }>()
const { user } = useUserSession()
const signOut = useSignOut()

const displayName = computed(() => user.value?.name || user.value?.email?.split("@")[0] || "Account")
const initials = computed(() =>
  displayName.value
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join(""),
)
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger
      class="cn-button cn-button--ghost cn-button--size-sm gap-2 border-transparent px-1.5 shadow-none hover:before:opacity-[0.07]"
      :aria-label="`Account menu for ${displayName}`"
      data-testid="user-menu"
    >
      <span
        class="grid size-7 place-items-center rounded-full bg-brand text-xs font-bold text-content-on-accent"
        aria-hidden="true"
      >{{ initials }}</span>
      <span class="max-w-32 truncate max-lg:sr-only">{{ displayName }}</span>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-60">
      <DropdownMenuLabel class="grid gap-0.5">
        <span class="truncate text-sm font-semibold">{{ displayName }}</span>
        <span class="truncate text-xs font-normal text-content-secondary">{{ user?.email }}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem as-child>
        <NuxtLink to="/account"><UserRound /> Account &amp; passkeys</NuxtLink>
      </DropdownMenuItem>
      <DropdownMenuItem @select="emit('appearance')"><Palette /> Appearance</DropdownMenuItem>
      <DropdownMenuItem as-child>
        <NuxtLink to="/docs"><BookOpen /> Documentation</NuxtLink>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" data-testid="sign-out" @select="signOut"><LogOut /> Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
