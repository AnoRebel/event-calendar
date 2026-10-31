// Pages with personal data require a session. Visitors without one go to the
// sign-in page and come back to where they were heading afterwards.
export default defineNuxtRouteMiddleware(to => {
  const { loggedIn } = useUserSession()
  if (!loggedIn.value) {
    return navigateTo({ path: "/login", query: to.fullPath !== "/" ? { redirect: to.fullPath } : {} })
  }
})
