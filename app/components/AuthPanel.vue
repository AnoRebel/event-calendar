<script setup lang="ts">
import { ref, computed } from "vue"
import { toast } from "vue-sonner"

// Sign-in / sign-up panel shown when the user is logged out. On success it
// refreshes the session so the app reveals the calendar.
const emit = defineEmits<{ (e: "authenticated"): void }>()

const { fetch: refreshSession } = useUserSession()

// Registration behavior comes from the server so the UI reflects reality:
// - needsBootstrap: the users table is empty → the first account may be created
//   with no invite (don't ask for one).
// - openRegistration: anyone may register.
// - demoEnabled: offer a one-click demo sign-in.
const { data: status } = await useFetch("/api/auth/status", { default: () => ({
  needsBootstrap: false,
  openRegistration: false,
  demoEnabled: false,
  demoEmail: undefined as string | undefined,
}) })

const mode = ref<"login" | "register">("login")
const email = ref("")
const password = ref("")
const name = ref("")
// Invite token: prefilled from a ?invite=… link when registration is invite-only.
const inviteToken = ref((useRoute().query.invite as string) || "")
const submitting = ref(false)

// Arriving via an invite link, or when the app needs its first (bootstrap)
// account, opens the register form directly.
if (inviteToken.value || status.value.needsBootstrap) mode.value = "register"

const isRegister = computed(() => mode.value === "register")
// Only ask for an invite when registration is closed AND this isn't the very
// first (bootstrap) account.
const inviteRequired = computed(
  () => !status.value.openRegistration && !status.value.needsBootstrap,
)
const showInviteField = computed(() => isRegister.value && inviteRequired.value)
const canSubmit = computed(
  () => email.value.trim().length > 3 && password.value.length >= 8 && !submitting.value,
)

const heading = computed(() => {
  if (!isRegister.value) return "Welcome back"
  return status.value.needsBootstrap ? "Create the first account" : "Create your account"
})
const subheading = computed(() => {
  if (!isRegister.value) return "Sign in to your calendar."
  return status.value.needsBootstrap
    ? "This account becomes the admin — no invite needed."
    : "Start organizing your events."
})

const demoSubmitting = ref(false)
const signInDemo = async () => {
  demoSubmitting.value = true
  try {
    await $fetch("/api/auth/demo", { method: "POST" })
    await refreshSession()
    toast.success("Welcome to the demo")
    emit("authenticated")
  } catch {
    toast.error("Could not start the demo", { description: "Please try again." })
  } finally {
    demoSubmitting.value = false
  }
}

const toggleMode = () => {
  mode.value = isRegister.value ? "login" : "register"
}

const submit = async () => {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    const endpoint = isRegister.value ? "/api/auth/register" : "/api/auth/login"
    await $fetch(endpoint, {
      method: "POST",
      body: {
        email: email.value.trim(),
        password: password.value,
        ...(isRegister.value
          ? { name: name.value.trim(), ...(inviteToken.value ? { inviteToken: inviteToken.value.trim() } : {}) }
          : {}),
      },
    })
    await refreshSession()
    toast.success(isRegister.value ? "Account created" : "Welcome back")
    emit("authenticated")
  } catch (err: unknown) {
    const message =
      (err as { data?: { statusMessage?: string }; statusMessage?: string })?.data?.statusMessage ||
      (err as { statusMessage?: string })?.statusMessage ||
      "Something went wrong. Please try again."
    toast.error(isRegister.value ? "Could not create account" : "Could not sign in", {
      description: message,
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <div class="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <Icon name="lucide:calendar-days" size="24" class="text-primary" />
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ heading }}
        </h1>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ subheading }}
        </p>
      </div>

      <!-- One-click demo sign-in (when demo mode is enabled). -->
      <div v-if="status.demoEnabled" class="mb-6">
        <button
          type="button"
          :disabled="demoSubmitting"
          class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          @click="signInDemo"
        >
          <Icon v-if="demoSubmitting" name="lucide:loader-circle" size="16" class="animate-spin" />
          <Icon v-else name="lucide:play" size="15" />
          Explore the demo — no signup
        </button>
        <div class="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span class="h-px flex-1 bg-border" />
          or
          <span class="h-px flex-1 bg-border" />
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div v-if="isRegister" class="space-y-1.5">
          <label for="auth-name" class="text-sm font-medium">Name</label>
          <input
            id="auth-name"
            v-model="name"
            type="text"
            autocomplete="name"
            placeholder="Your name"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div v-if="showInviteField" class="space-y-1.5">
          <label for="auth-invite" class="text-sm font-medium">Invite code</label>
          <input
            id="auth-invite"
            v-model="inviteToken"
            type="text"
            placeholder="Paste your invite code"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p class="text-xs text-muted-foreground">Registration is invite-only.</p>
        </div>

        <div class="space-y-1.5">
          <label for="auth-email" class="text-sm font-medium">Email</label>
          <input
            id="auth-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div class="space-y-1.5">
          <label for="auth-password" class="text-sm font-medium">Password</label>
          <input
            id="auth-password"
            v-model="password"
            type="password"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            required
            minlength="8"
            placeholder="At least 8 characters"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <button
          type="submit"
          :disabled="!canSubmit"
          class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon v-if="submitting" name="lucide:loader-circle" size="16" class="animate-spin" />
          {{ isRegister ? "Create account" : "Sign in" }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-muted-foreground">
        {{ isRegister ? "Already have an account?" : "Don't have an account?" }}
        <button
          type="button"
          class="font-medium text-primary underline-offset-4 hover:underline"
          @click="toggleMode"
        >
          {{ isRegister ? "Sign in" : "Sign up" }}
        </button>
      </p>
    </div>
  </div>
</template>
