<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useForm } from "@tanstack/vue-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query"
import { useClipboard } from "@vueuse/core"
import { format, formatDistanceToNow, parseISO } from "date-fns"
import * as v from "valibot"
import { toast } from "vue-sonner"
import {
  Check,
  Cloud,
  Copy,
  Fingerprint,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

definePageMeta({ middleware: "auth" })
useHead({ title: "Account" })

interface Passkey {
  id: string
  name: string
  backedUp: boolean
  createdAt: string
  lastUsedAt: string | null
}
interface Account {
  id: string
  email: string
  name: string | null
  createdAt: string
  hasPassword: boolean
  isDemo: boolean
  passkeys: Passkey[]
}
interface Invite {
  token: string
  email: string | null
  createdAt: string
  expiresAt: string | null
  status: "active" | "used" | "expired"
}

const queryClient = useQueryClient()
const { fetch: refreshSession } = useUserSession()
const passkeys = usePasskeys()
const signOut = useSignOut()
const requestURL = useRequestURL()

const { data: account, isPending, error } = useQuery({
  queryKey: ["account"],
  queryFn: () => $fetch<Account>("/api/account"),
  enabled: import.meta.client,
})
const { data: inviteData } = useQuery({
  queryKey: ["invites"],
  queryFn: () => $fetch<{ openRegistration: boolean; invites: Invite[] }>("/api/invites"),
  enabled: import.meta.client,
})

const refreshAccount = () => queryClient.invalidateQueries({ queryKey: ["account"] })
const issues = (errors: unknown[]) =>
  errors
    .flatMap(e => (Array.isArray(e) ? e : [e]))
    .map(e => (typeof e === "string" ? e : (e as { message?: string })?.message))
    .filter(Boolean)
    .join(", ")
const when = (iso: string | null) => (iso ? formatDistanceToNow(parseISO(iso), { addSuffix: true }) : "never")

// --- Profile ----------------------------------------------------------------------
const profileForm = useForm({
  defaultValues: { name: "" },
  onSubmit: async ({ value }) => {
    try {
      await $fetch("/api/account", { method: "PATCH", body: { name: value.name } })
      await Promise.all([refreshAccount(), refreshSession()])
      toast.success("Profile saved")
    } catch (err) {
      toast.error("Couldn't save your profile", { description: errorMessage(err) })
    }
  },
})
const nameRule = v.pipe(v.string(), v.trim(), v.maxLength(100, "Keep your name under 100 characters"))
// Fill the form once the account loads.
watch(
  () => account.value?.name,
  name => profileForm.setFieldValue("name", name ?? ""),
  { immediate: true },
)

// --- Passkeys ----------------------------------------------------------------------
const addingPasskey = ref(false)
const addPasskey = async () => {
  if (!account.value) return
  addingPasskey.value = true
  try {
    await passkeys.register({ userName: account.value.email, displayName: account.value.name ?? undefined })
    await refreshAccount()
    toast.success("Passkey added", { description: "You can now sign in with it." })
  } catch (err) {
    if (!isPasskeyCancel(err)) toast.error("Couldn't add the passkey", { description: passkeyErrorMessage(err) })
  } finally {
    addingPasskey.value = false
  }
}

const renaming = ref<Passkey | null>(null)
const renameForm = useForm({
  defaultValues: { name: "" },
  onSubmit: async ({ value }) => {
    if (!renaming.value) return
    try {
      await $fetch(`/api/account/passkeys/${encodeURIComponent(renaming.value.id)}`, {
        method: "PATCH",
        body: { name: value.name },
      })
      await refreshAccount()
      renaming.value = null
      toast.success("Passkey renamed")
    } catch (err) {
      toast.error("Couldn't rename the passkey", { description: errorMessage(err) })
    }
  },
})
const renameRule = v.pipe(v.string(), v.trim(), v.nonEmpty("Give the passkey a name"), v.maxLength(60, "Keep the name under 60 characters"))
const startRename = (passkey: Passkey) => {
  renameForm.reset({ name: passkey.name })
  renaming.value = passkey
}

const removing = ref<Passkey | null>(null)
const removeMutation = useMutation({
  mutationFn: (id: string) => $fetch(`/api/account/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" }),
  onSuccess: async () => {
    await refreshAccount()
    removing.value = null
    toast.success("Passkey removed")
  },
  onError: err => toast.error("Couldn't remove the passkey", { description: errorMessage(err) }),
})
const isLastMethod = computed(() => !!account.value && !account.value.hasPassword && account.value.passkeys.length <= 1)

// --- Password ----------------------------------------------------------------------
const passwordForm = useForm({
  defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  onSubmit: async ({ value, formApi }) => {
    try {
      await $fetch("/api/account/password", {
        method: "PUT",
        body: { currentPassword: value.currentPassword || undefined, newPassword: value.newPassword },
      })
      await refreshAccount()
      formApi.reset()
      toast.success(account.value?.hasPassword ? "Password changed" : "Password set")
    } catch (err) {
      toast.error("Couldn't update your password", { description: errorMessage(err) })
    }
  },
})
const newPasswordRule = v.pipe(v.string(), v.minLength(8, "Use at least 8 characters"))
const confirmRule = v.pipe(
  v.string(),
  v.check(value => value === passwordForm.getFieldValue("newPassword"), "The passwords don't match"),
)
const currentPasswordRule = v.pipe(
  v.string(),
  v.check(value => !account.value?.hasPassword || value.length > 0, "Enter your current password"),
)

// --- Invites -----------------------------------------------------------------------
const inviteLink = (token: string) => `${requestURL.origin}/login?invite=${encodeURIComponent(token)}`
const { copy, copied, isSupported: canCopy } = useClipboard({ copiedDuring: 1500 })
const lastCopied = ref("")
const copyInvite = async (token: string) => {
  await copy(inviteLink(token))
  lastCopied.value = token
  toast.success("Invite link copied")
}

const inviteForm = useForm({
  defaultValues: { email: "", expiresInDays: "14" },
  onSubmit: async ({ value, formApi }) => {
    try {
      const invite = await $fetch<{ token: string }>("/api/invites", {
        method: "POST",
        body: { email: value.email.trim() || undefined, expiresInDays: Number(value.expiresInDays) },
      })
      await queryClient.invalidateQueries({ queryKey: ["invites"] })
      formApi.reset()
      if (canCopy.value) await copyInvite(invite.token)
      else toast.success("Invite created")
    } catch (err) {
      toast.error("Couldn't create the invite", { description: errorMessage(err) })
    }
  },
})
const inviteEmailRule = v.pipe(
  v.string(),
  v.trim(),
  v.check(value => value === "" || v.is(v.pipe(v.string(), v.email()), value), "Enter a valid email or leave it empty"),
)
const revokeMutation = useMutation({
  mutationFn: (token: string) => $fetch(`/api/invites/${encodeURIComponent(token)}`, { method: "DELETE" }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["invites"] })
    toast.success("Invite revoked")
  },
  onError: err => toast.error("Couldn't revoke the invite", { description: errorMessage(err) }),
})

const statusVariant = (status: Invite["status"]) => (status === "active" ? "default" : "secondary")
</script>

<template>
  <div class="mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-8">
    <header class="flex flex-wrap items-end justify-between gap-3 px-1">
      <div class="min-w-0">
        <h1 class="mb-1 text-2xl font-bold tracking-tight sm:text-3xl">Account</h1>
        <p class="mb-0 text-sm text-content-secondary">Your profile, how you sign in, and who you invite.</p>
      </div>
      <Button variant="outline" type="button" data-testid="account-sign-out" @click="signOut"><LogOut /> Sign out</Button>
    </header>

    <div v-if="isPending" class="surface-panel grid place-items-center p-12" role="status">
      <Loader2 class="size-6 animate-spin text-content-secondary" aria-label="Loading your account" />
    </div>
    <div v-else-if="error || !account" class="surface-panel p-6 text-sm text-danger-content" role="alert">
      {{ errorMessage(error, "We couldn't load your account.") }}
    </div>

    <template v-else>
      <p
        v-if="account.isDemo"
        class="rounded-lg border border-line bg-brand-soft px-4 py-3 text-sm"
      >
        You're using the shared demo account. Its sign-in methods can't be changed, and its events reset daily.
      </p>

      <!-- Profile -->
      <section class="surface-panel grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-6" aria-labelledby="profile-heading">
        <div class="flex min-w-0 items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-subtle" aria-hidden="true"><UserRound class="size-5" /></span>
          <div class="min-w-0">
            <h2 id="profile-heading" class="mb-0 text-lg font-semibold">Profile</h2>
            <p class="mb-0 truncate text-sm text-content-secondary">
              {{ account.email }} · member since {{ format(parseISO(account.createdAt), "MMMM yyyy") }}
            </p>
          </div>
        </div>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" novalidate @submit.prevent="profileForm.handleSubmit()">
          <profileForm.Field name="name" :validators="{ onChange: nameRule }">
            <template #default="{ field }">
              <div class="grid flex-1 gap-1.5">
                <Label for="profile-name">Display name</Label>
                <Input
                  id="profile-name"
                  autocomplete="name"
                  :model-value="field.state.value"
                  @update:model-value="field.handleChange(String($event))"
                  @blur="field.handleBlur"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
              </div>
            </template>
          </profileForm.Field>
          <profileForm.Subscribe>
            <template #default="{ isSubmitting, isDirty }">
              <Button type="submit" variant="outline" :disabled="isSubmitting || !isDirty">Save</Button>
            </template>
          </profileForm.Subscribe>
        </form>
      </section>

      <!-- Passkeys -->
      <section class="surface-panel grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-6" aria-labelledby="passkeys-heading">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-subtle" aria-hidden="true"><Fingerprint class="size-5" /></span>
            <div>
              <h2 id="passkeys-heading" class="mb-0 text-lg font-semibold">Passkeys</h2>
              <p class="mb-0 text-sm text-content-secondary">Sign in with your fingerprint, face or screen lock.</p>
            </div>
          </div>
          <Button
            type="button"
            :disabled="account.isDemo || addingPasskey || !passkeys.supported.value"
            data-testid="add-passkey"
            @click="addPasskey"
          >
            <Loader2 v-if="addingPasskey" class="animate-spin" />
            <Plus v-else />
            Add a passkey
          </Button>
        </div>
        <p v-if="!passkeys.supported.value" class="text-sm text-content-secondary">This browser can't create passkeys.</p>

        <ul v-if="account.passkeys.length" class="grid divide-y divide-line-subtle rounded-lg border border-line-subtle" data-testid="passkey-list">
          <li v-for="passkey in account.passkeys" :key="passkey.id" class="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
            <KeyRound class="size-5 shrink-0 text-content-secondary" aria-hidden="true" />
            <div class="min-w-0 flex-1">
              <p class="mb-0 flex flex-wrap items-center gap-2 font-medium">
                <span class="truncate">{{ passkey.name }}</span>
                <Badge v-if="passkey.backedUp" variant="secondary" class="gap-1"><Cloud class="size-3" /> Synced</Badge>
              </p>
              <p class="mb-0 text-xs text-content-secondary">Added {{ when(passkey.createdAt) }} · last used {{ when(passkey.lastUsedAt) }}</p>
            </div>
            <div class="flex gap-1">
              <Button variant="ghost" size="icon-sm" type="button" :aria-label="`Rename ${passkey.name}`" @click="startRename(passkey)"><Pencil /></Button>
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                class="text-danger-content"
                :aria-label="`Remove ${passkey.name}`"
                @click="removing = passkey"
              ><Trash2 /></Button>
            </div>
          </li>
        </ul>
        <p v-else class="rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-content-secondary">
          No passkeys yet. Add one to sign in without a password.
        </p>
      </section>

      <!-- Password -->
      <section class="surface-panel grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-6" aria-labelledby="password-heading">
        <div class="flex min-w-0 items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-subtle" aria-hidden="true"><KeyRound class="size-5" /></span>
          <div>
            <h2 id="password-heading" class="mb-0 text-lg font-semibold">Password</h2>
            <p class="mb-0 text-sm text-content-secondary">
              {{ account.hasPassword ? "Change the password you sign in with." : "You sign in with passkeys only. Set a password as a backup." }}
            </p>
          </div>
        </div>
        <form class="grid gap-3 sm:grid-cols-2" novalidate @submit.prevent="passwordForm.handleSubmit()">
          <input type="email" class="sr-only" autocomplete="username" :value="account.email" tabindex="-1" aria-hidden="true" readonly>
          <passwordForm.Field v-if="account.hasPassword" name="currentPassword" :validators="{ onSubmit: currentPasswordRule }">
            <template #default="{ field }">
              <div class="grid gap-1.5 sm:col-span-2">
                <Label for="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autocomplete="current-password"
                  :disabled="account.isDemo"
                  :model-value="field.state.value"
                  @update:model-value="field.handleChange(String($event))"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
              </div>
            </template>
          </passwordForm.Field>
          <passwordForm.Field name="newPassword" :validators="{ onSubmit: newPasswordRule, onBlur: newPasswordRule }">
            <template #default="{ field }">
              <div class="grid gap-1.5">
                <Label for="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autocomplete="new-password"
                  :disabled="account.isDemo"
                  :model-value="field.state.value"
                  @update:model-value="field.handleChange(String($event))"
                  @blur="field.handleBlur"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
              </div>
            </template>
          </passwordForm.Field>
          <passwordForm.Field name="confirm" :validators="{ onSubmit: confirmRule }">
            <template #default="{ field }">
              <div class="grid gap-1.5">
                <Label for="confirm-password">Confirm</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autocomplete="new-password"
                  :disabled="account.isDemo"
                  :model-value="field.state.value"
                  @update:model-value="field.handleChange(String($event))"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
              </div>
            </template>
          </passwordForm.Field>
          <div class="sm:col-span-2">
            <passwordForm.Subscribe>
              <template #default="{ isSubmitting }">
                <Button type="submit" variant="outline" :disabled="account.isDemo || isSubmitting">
                  {{ account.hasPassword ? "Change password" : "Set password" }}
                </Button>
              </template>
            </passwordForm.Subscribe>
          </div>
        </form>
      </section>

      <!-- Invites -->
      <section class="surface-panel grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-6" aria-labelledby="invites-heading">
        <div class="flex min-w-0 items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-subtle" aria-hidden="true"><Link2 class="size-5" /></span>
          <div>
            <h2 id="invites-heading" class="mb-0 text-lg font-semibold">Invite someone</h2>
            <p class="mb-0 text-sm text-content-secondary">
              {{ inviteData?.openRegistration ? "Registration is open, so anyone can sign up. Invites still work." : "Registration is invite-only. Each link works once." }}
            </p>
          </div>
        </div>
        <form class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end" novalidate @submit.prevent="inviteForm.handleSubmit()">
          <inviteForm.Field name="email" :validators="{ onSubmit: inviteEmailRule }">
            <template #default="{ field }">
              <div class="grid gap-1.5">
                <Label for="invite-email">Email <span class="font-normal text-content-tertiary">(optional)</span></Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="Only this person can use it"
                  :model-value="field.state.value"
                  @update:model-value="field.handleChange(String($event))"
                />
                <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
              </div>
            </template>
          </inviteForm.Field>
          <inviteForm.Field name="expiresInDays">
            <template #default="{ field }">
              <div class="grid gap-1.5">
                <Label for="invite-expiry">Expires in</Label>
                <Select :model-value="field.state.value" @update:model-value="field.handleChange(String($event))">
                  <SelectTrigger id="invite-expiry" class="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </template>
          </inviteForm.Field>
          <inviteForm.Subscribe>
            <template #default="{ isSubmitting }">
              <Button type="submit" :disabled="isSubmitting" data-testid="create-invite"><Plus /> Create link</Button>
            </template>
          </inviteForm.Subscribe>
        </form>

        <ul v-if="inviteData?.invites.length" class="grid divide-y divide-line-subtle rounded-lg border border-line-subtle">
          <li v-for="invite in inviteData.invites" :key="invite.token" class="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
            <div class="min-w-0 flex-1">
              <p class="mb-0 flex flex-wrap items-center gap-2 text-sm font-medium">
                <span class="truncate">{{ invite.email || "Anyone with the link" }}</span>
                <Badge :variant="statusVariant(invite.status)" class="capitalize">{{ invite.status }}</Badge>
              </p>
              <p class="mb-0 text-xs text-content-secondary">
                Created {{ when(invite.createdAt) }}<template v-if="invite.status === 'active' && invite.expiresAt"> · expires {{ when(invite.expiresAt) }}</template>
              </p>
            </div>
            <div v-if="invite.status === 'active'" class="flex gap-1">
              <Button variant="ghost" size="sm" type="button" :aria-label="`Copy invite link${invite.email ? ` for ${invite.email}` : ''}`" @click="copyInvite(invite.token)">
                <Check v-if="copied && lastCopied === invite.token" />
                <Copy v-else />
                <span class="max-sm:sr-only">Copy link</span>
              </Button>
              <Button variant="ghost" size="icon-sm" type="button" class="text-danger-content" aria-label="Revoke invite" @click="revokeMutation.mutate(invite.token)"><Trash2 /></Button>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <!-- Rename passkey -->
    <Dialog :open="!!renaming" @update:open="open => !open && (renaming = null)">
      <DialogContent class="sm:max-w-md">
        <form class="grid gap-4" novalidate @submit.prevent="renameForm.handleSubmit()">
          <DialogHeader>
            <DialogTitle>Rename passkey</DialogTitle>
            <DialogDescription>Name it after the device or password manager that holds it.</DialogDescription>
          </DialogHeader>
          <renameForm.Field name="name" :validators="{ onChange: renameRule, onSubmit: renameRule }">
            <template #default="{ field }">
              <div class="grid gap-1.5">
                <Label for="passkey-name">Name</Label>
                <Input id="passkey-name" :model-value="field.state.value" @update:model-value="field.handleChange(String($event))" />
                <p v-if="!field.state.meta.isValid" class="text-xs text-danger-content">{{ issues(field.state.meta.errors) }}</p>
              </div>
            </template>
          </renameForm.Field>
          <DialogFooter class="grid grid-cols-2 sm:flex">
            <Button type="button" variant="outline" @click="renaming = null">Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Remove passkey -->
    <Dialog :open="!!removing" @update:open="open => !open && (removing = null)">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove "{{ removing?.name }}"?</DialogTitle>
          <DialogDescription>
            <template v-if="isLastMethod">
              This is your only way to sign in. Add another passkey or set a password before removing it.
            </template>
            <template v-else>You won't be able to sign in with this passkey any more. Also delete it from the device or password manager that holds it.</template>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="grid grid-cols-2 sm:flex">
          <Button type="button" variant="outline" @click="removing = null">Cancel</Button>
          <Button
            type="button"
            variant="destructive"
            :disabled="isLastMethod || removeMutation.isPending.value"
            @click="removing && removeMutation.mutate(removing.id)"
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
