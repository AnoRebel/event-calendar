// nuxt-authorization needs to know how to resolve the current user on the server.
// Wire it to the nuxt-auth-utils session so abilities receive the session user.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("request", (event) => {
    event.context.$authorization = {
      resolveServerUser: async () => {
        const session = await getUserSession(event)
        return session.user ?? null
      },
    }
  })
})
