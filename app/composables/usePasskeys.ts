import { onMounted, ref } from "vue"
import {
  WebAuthnAbortService,
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser"
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser"

export interface PasskeyUser {
  /** The account email. */
  userName: string
  displayName?: string
  inviteToken?: string
}

// Passkey ceremonies against the nuxt-auth-utils WebAuthn endpoints, with
// friendly errors and the browser's conditional-UI (autofill) sign-in.
export function usePasskeys() {
  const supported = ref(false)
  const autofillSupported = ref(false)

  onMounted(async () => {
    supported.value = browserSupportsWebAuthn()
    autofillSupported.value = supported.value && (await browserSupportsWebAuthnAutofill().catch(() => false))
  })

  /** Create a passkey: a new account when signed out, or another passkey for the current one. */
  async function register(user: PasskeyUser) {
    const { creationOptions, attemptId } = await $fetch<{
      creationOptions: PublicKeyCredentialCreationOptionsJSON
      attemptId: string
    }>("/api/webauthn/register", { method: "POST", body: { user, verify: false } })
    const response = await startRegistration({ optionsJSON: creationOptions })
    await $fetch("/api/webauthn/register", { method: "POST", body: { user, attemptId, response, verify: true } })
  }

  /**
   * Sign in with a passkey. With `autofill`, the request waits silently for the
   * user to pick a passkey from the email field's autofill menu.
   */
  async function authenticate(options: { autofill?: boolean } = {}) {
    const { requestOptions, attemptId } = await $fetch<{
      requestOptions: PublicKeyCredentialRequestOptionsJSON
      attemptId: string
    }>("/api/webauthn/authenticate", { method: "POST", body: { verify: false } })
    const response = await startAuthentication({ optionsJSON: requestOptions, useBrowserAutofill: options.autofill })
    await $fetch("/api/webauthn/authenticate", { method: "POST", body: { attemptId, response, verify: true } })
  }

  /** Abort a pending ceremony (e.g. the autofill request when the user switches to a button). */
  const cancel = () => WebAuthnAbortService.cancelCeremony()

  return { supported, autofillSupported, register, authenticate, cancel }
}

/** True when the user simply dismissed the browser's passkey prompt. */
export function isPasskeyCancel(err: unknown) {
  const name = (err as { name?: string; cause?: { name?: string } })?.name
  const cause = (err as { cause?: { name?: string } })?.cause?.name
  return name === "AbortError" || cause === "AbortError" || name === "NotAllowedError" || cause === "NotAllowedError"
}

export function passkeyErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name
  const code = (err as { code?: string })?.code
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" || name === "InvalidStateError") {
    return "This device already has a passkey for this account."
  }
  if (isPasskeyCancel(err)) return "The passkey request was cancelled or timed out."
  if (name === "SecurityError") return "Passkeys need a secure connection (HTTPS) on this site's own domain."
  return errorMessage(err, "The passkey could not be used. Please try again.")
}
