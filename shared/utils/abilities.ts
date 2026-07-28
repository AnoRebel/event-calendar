import { defineAbility } from "nuxt-authorization/utils"

// Minimal auth-model type shared client/server. Matches what setUserSession stores.
export interface SessionUser {
  id: string
  email: string
  name?: string | null
}

export interface OwnedEvent {
  id: string
  ownerId?: string | null
}

// A user may edit/delete an event they own. Ownership is the enforcement point;
// the UI uses the same ability for gating, but the server is authoritative.
export const editEvent = defineAbility((user: SessionUser, event: OwnedEvent) => {
  return !!event.ownerId && event.ownerId === user.id
})

export const deleteEvent = defineAbility((user: SessionUser, event: OwnedEvent) => {
  return !!event.ownerId && event.ownerId === user.id
})
