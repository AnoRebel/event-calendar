import type { H3Event } from "h3"
import type { RequestEvent } from "nuxt/server"
import type { BouncerAbility, BouncerArgs } from "nuxt-authorization/utils"

// nuxt-authorization's `authorize()` is still typed against h3's `H3Event`, while
// handlers written with `nuxt/server` receive a `RequestEvent`. At runtime they are
// the same request event (nuxt-authorization only reads `event.context` and the
// session resolved by server/plugins/authorization.ts), so this bridges the types
// in one place instead of casting in every handler.
export function authorizeRequest<Ability extends BouncerAbility<any>>(
  event: RequestEvent,
  ability: Ability,
  ...args: BouncerArgs<Ability>
): Promise<void> {
  return authorize(event as unknown as H3Event, ability, ...args)
}
