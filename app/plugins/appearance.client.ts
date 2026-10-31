// Mirror the appearance the pre-paint script applied into reactive state, and
// start the system-theme and refraction watchers.
export default defineNuxtPlugin(() => {
  useAppearance().init()
})
