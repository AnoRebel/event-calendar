<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useForm } from "@tanstack/vue-form"
import { useQuery } from "@tanstack/vue-query"
import * as v from "valibot"
import { toast } from "vue-sonner"
import { Fingerprint, KeyRound, Loader2, Play, Sparkles } from "lucide-vue-next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

definePageMeta({ name: "login" })
useHead({ title: "Sign in" })

interface AuthStatus {
  needsBootstrap: boolean
  openRegistration: boolean
  demoEnabled: boolean
}

const route = useRoute()
const { loggedIn, fetch: refreshSession } = useUserSession()
const passkeys = usePasskeys()

// Where to go after signing in (only same-site paths).
const redirectTo = computed(() => {
  const target = String(route.query.redirect || "/")
  return target.startsWith("/") && !target.startsWith("//") ? target : "/"
})

// Already signed in (e.g. back button): go straight on.
watch(loggedIn, value => value && navigateTo(redirectTo.value, { replace: true }), { immediate: true })

const { data: status } = useQuery({
  queryKey: ["auth-status"],
  queryFn: () => $fetch<AuthStatus>("/api/auth/status"),
  enabled: import.meta.client,
  staleTime: 0,
})

const inviteFromLink = String(route.query.invite || "")
const mode = ref<"signin" | "register">(inviteFromLink ? "register" : "signin")
watch(
  () => status.value?.needsBootstrap,
  needs => {
    if (needs) mode.value = "register"
  },
)

const inviteRequired = computed(() => !!status.value && !status.value.openRegistration && !status.value.needsBootstrap)
const busy = ref<"passkey" | "password" | "demo" | null>(null)

const finish = async (message: string) => {
  await refreshSession()
  toast.success(message)
  await navigateTo(redirectTo.value, { replace: true })
}

// --- Sign in -----------------------------------------------------------------
const email = v.pipe(v.string(), v.trim(), v.nonEmpty("Enter your email"), v.email("Enter a valid email"))

const signInForm = useForm({
  defaultValues: { email: "", password: "" },
  validators: {
    onSubmit: v.object({ email, password: v.pipe(v.string(), v.nonEmpty("Enter your password")) }),
  },
  onSubmit: async ({ value }) => {
    passkeys.cancel()
    busy.value = "password"
    try {
      await $fetch("/api/auth/login", { method: "POST", body: value })
      await finish("Welcome back")
    } catch (err) {
      toast.error("Could not sign in", { description: errorMessage(err) })
    } finally {
      busy.value = null
    }
  },
})

const signInWithPasskey = async (autofill = false) => {
  if (!autofill) {
    passkeys.cancel()
    busy.value = "passkey"
  }
  try {
    await passkeys.authenticate({ autofill })
    await finish("Signed in with your passkey")
  } catch (err) {
    // The autofill request runs silently in the background (and browsers may
    // decline it); only a sign-in the user started deserves a message, and not
    // when they simply dismissed the prompt.
    if (!autofill && !isPasskeyCancel(err)) toast.error("Passkey sign-in failed", { description: passkeyErrorMessage(err) })
  } finally {
    if (!autofill) busy.value = null
  }
}

// Offer passkeys in the email field's autofill menu (conditional UI).
const startAutofill = () => {
  if (mode.value === "signin" && passkeys.autofillSupported.value) signInWithPasskey(true)
}
onMounted(() => setTimeout(startAutofill, 0))
watch([mode, passkeys.autofillSupported], startAutofill)
onBeforeUnmount(() => passkeys.cancel())

// --- Create account ------------------------------------------------------------
const usePassword = ref(false)
// Password sign-up when chosen, or when this browser can't create passkeys.
const passwordMode = computed(() => usePassword.value || !passkeys.supported.value)

const registerForm = useForm({
  defaultValues: { name: "", email: "", inviteToken: inviteFromLink, password: "" },
  onSubmit: async ({ value }) => {
    const profile = {
      email: value.email.trim().toLowerCase(),
      name: value.name.trim(),
      inviteToken: value.inviteToken.trim() || undefined,
    }
    if (passwordMode.value) {
      busy.value = "password"
      try {
        await $fetch("/api/auth/register", { method: "POST", body: { ...profile, password: value.password } })
        await finish("Account created")
      } catch (err) {
        toast.error("Could not create your account", { description: errorMessage(err) })
      } finally {
        busy.value = null
      }
      return
    }
    passkeys.cancel()
    busy.value = "passkey"
    try {
      await passkeys.register({ userName: profile.email, displayName: profile.name || undefined, inviteToken: profile.inviteToken })
      await finish("Account created with a passkey")
    } catch (err) {
      if (!isPasskeyCancel(err)) toast.error("Could not create your account", { description: passkeyErrorMessage(err) })
    } finally {
      busy.value = null
    }
  },
})

const nameRule = v.pipe(v.string(), v.trim(), v.maxLength(100, "Keep your name under 100 characters"))
// The password only matters when signing up with one; the invite only when the
// server says registration is invite-only.
const passwordRule = v.pipe(
  v.string(),
  v.check(value => !passwordMode.value || value.length >= 8, "Use at least 8 characters"),
)
const inviteRule = v.pipe(
  v.string(),
  v.check(value => !inviteRequired.value || value.trim().length > 0, "An invite code is required"),
)

// --- Demo -------------------------------------------------------------------------
const signInDemo = async () => {
  passkeys.cancel()
  busy.value = "demo"
  try {
    await $fetch("/api/auth/demo", { method: "POST" })
    await finish("Welcome to the demo")
  } catch (err) {
    toast.error("Could not start the demo", { description: errorMessage(err) })
  } finally {
    busy.value = null
  }
}

const issues = (errors: unknown[]) =>
  errors
    .flatMap(e => (Array.isArray(e) ? e : [e]))
    .map(e => (typeof e === "string" ? e : (e as { message?: string })?.message))
    .filter(Boolean)
    .join(", ")

const heading = computed(() => {
  if (mode.value === "signin") return "Welcome back"
  return status.value?.needsBootstrap ? "Create the first account" : "Create your account"
})
const subheading = computed(() => {
  if (mode.value === "signin") return "Sign in to see your calendar."
  if (status.value?.needsBootstrap) return "This account becomes the admin. No invite needed."
  if (inviteRequired.value) return "Registration is invite-only. Paste the code from your invite link."
  return "It takes a few seconds with a passkey."
})
</script>

<template>
  <div class="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
    <div class="surface-panel w-full max-w-md p-5 sm:p-8">
      <div class="mb-6 flex flex-col items-center gap-3 text-center">
        <BrandMark :size="44" />
        <div>
          <h1 class="mb-1 text-2xl font-bold tracking-tight">{{ heading }}</h1>
          <p class="mb-0 text-sm text-content-secondary">{{ subheading }}</p>
        </div>
      </div>

      <fieldset class="cn-segmented cn-segmented--block mb-6 w-full">
        <legend>Choose</legend>
        <label class="cn-segmented__item">
          <input v-model="mode" class="cn-segmented__input" type="radio" name="auth-mode" value="signin" data-testid="mode-signin">
          <span class="cn-segmented__label">Sign in</span>
        </label>
        <label class="cn-segmented__item">
          <input v-model="mode" class="cn-segmented__input" type="radio" name="auth-mode" value="register" data-testid="mode-register">
          <span class="cn-segmented__label">Create account</span>
        </label>
      </fieldset>

      <!-- Sign in -->
      <div v-if="mode === 'signin'" class="grid gap-5">
        <Button
          v-if="passkeys.supported.value"
          size="lg"
          class="w-full"
          type="button"
          :disabled="busy !== null"
          data-testid="passkey-signin"
          @click="signInWithPasskey(false)"
        >
          <Loader2 v-if="busy === 'passkey'" class="animate-spin" />
          <Fingerprint v-else />
          Sign in with a passkey
        </Button>

        <div v-if="passkeys.supported.value" class="flex items-center gap-3 text-xs text-content-tertiary">
          <span class="h-px flex-1 bg-line-subtle" /> or use your password <span class="h-px flex-1 bg-line-subtle" />
        </div>

        <form class="grid gap-4" novalidate @submit.prevent="signInForm.handleSubmit()">
          <signInForm.Field name="email">
            <template #default="{ field }">
              <div class="grid gap-1.5">
                <Label for="signin-email">Email</Label>
                <!-- "webauthn" lets the browser offer passkeys in this field's autofill. -->
                <Input
                  id="signin-email"
                  type="email"
                  inputmode="email"
                  autocomplete="username webauthn"
                  placeholder="you@example.com"
                  :model-value="field.state.value"
                  :aria-invalid="!field.state.meta.isValid || undefined"
                  @update:model-value="field.handleChange(String($event))"
                  @blur="field.handleBlur"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
              </div>
            </template>
          </signInForm.Field>
          <signInForm.Field name="password">
            <template #default="{ field }">
              <div class="grid gap-1.5">
                <Label for="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  autocomplete="current-password"
                  :model-value="field.state.value"
                  :aria-invalid="!field.state.meta.isValid || undefined"
                  @update:model-value="field.handleChange(String($event))"
                  @blur="field.handleBlur"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
              </div>
            </template>
          </signInForm.Field>
          <Button
            type="submit"
            :variant="passkeys.supported.value ? 'outline' : 'default'"
            class="w-full"
            :disabled="busy !== null"
            data-testid="password-signin"
          >
            <Loader2 v-if="busy === 'password'" class="animate-spin" />
            <KeyRound v-else />
            Sign in with password
          </Button>
        </form>
      </div>

      <!-- Create account -->
      <form v-else class="grid gap-4" novalidate @submit.prevent="registerForm.handleSubmit()">
        <registerForm.Field name="name" :validators="{ onBlur: nameRule }">
          <template #default="{ field }">
            <div class="grid gap-1.5">
              <Label for="register-name">Name</Label>
              <Input
                id="register-name"
                autocomplete="name"
                placeholder="How should we greet you?"
                :model-value="field.state.value"
                @update:model-value="field.handleChange(String($event))"
                @blur="field.handleBlur"
              />
              <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
            </div>
          </template>
        </registerForm.Field>

        <registerForm.Field name="email" :validators="{ onSubmit: email, onBlur: email }">
          <template #default="{ field }">
            <div class="grid gap-1.5">
              <Label for="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="you@example.com"
                :model-value="field.state.value"
                :aria-invalid="!field.state.meta.isValid || undefined"
                @update:model-value="field.handleChange(String($event))"
                @blur="field.handleBlur"
              />
              <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
            </div>
          </template>
        </registerForm.Field>

        <registerForm.Field v-if="inviteRequired" name="inviteToken" :validators="{ onSubmit: inviteRule }">
          <template #default="{ field }">
            <div class="grid gap-1.5">
              <Label for="register-invite">Invite code</Label>
              <Input
                id="register-invite"
                autocomplete="off"
                placeholder="Paste your invite code"
                :model-value="field.state.value"
                :aria-invalid="!field.state.meta.isValid || undefined"
                @update:model-value="field.handleChange(String($event))"
                @blur="field.handleBlur"
              />
              <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
            </div>
          </template>
        </registerForm.Field>

        <registerForm.Field v-if="passwordMode" name="password" :validators="{ onSubmit: passwordRule }">
          <template #default="{ field }">
            <div class="grid gap-1.5">
              <Label for="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                autocomplete="new-password"
                placeholder="At least 8 characters"
                :model-value="field.state.value"
                :aria-invalid="!field.state.meta.isValid || undefined"
                @update:model-value="field.handleChange(String($event))"
                @blur="field.handleBlur"
              />
              <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
            </div>
          </template>
        </registerForm.Field>

        <Button type="submit" size="lg" class="w-full" :disabled="busy !== null" data-testid="register-submit">
          <Loader2 v-if="busy" class="animate-spin" />
          <KeyRound v-else-if="passwordMode" />
          <Fingerprint v-else />
          {{ passwordMode ? "Create account" : "Create account with a passkey" }}
        </Button>

        <p v-if="passkeys.supported.value" class="text-center text-sm text-content-secondary">
          <button
            type="button"
            class="font-medium text-brand-subtle underline underline-offset-4"
            data-testid="toggle-password-signup"
            @click="usePassword = !usePassword"
          >
            {{ usePassword ? "Use a passkey instead" : "Use a password instead" }}
          </button>
        </p>
        <p v-if="!usePassword && passkeys.supported.value" class="flex gap-2 rounded-lg bg-brand-soft p-3 text-xs text-content-secondary">
          <Sparkles class="mt-0.5 size-4 shrink-0 text-brand-subtle" aria-hidden="true" />
          A passkey signs you in with your fingerprint, face or screen lock. Nothing to remember, nothing to phish.
        </p>
      </form>

      <!-- One-click demo -->
      <div v-if="status?.demoEnabled" class="mt-6 border-t border-line-subtle pt-6">
        <Button variant="ghost" class="w-full" type="button" :disabled="busy !== null" data-testid="demo-signin" @click="signInDemo">
          <Loader2 v-if="busy === 'demo'" class="animate-spin" />
          <Play v-else />
          Explore the demo, no sign-up
        </Button>
      </div>
    </div>
  </div>
</template>
