## 1. Remove vue-dnd-kit

- [x] 1.1 Delete `composables/useDragAndDrop.ts` and its test mock; drop `@vue-dnd-kit/*` from package.json, the Nuxt
      modules, `app.vue` and `registry.json`
- [x] 1.2 Cancel a drag when released outside any drop target (time grid and month view)
- [x] 1.3 Update docs (installation, usage), README and the registry output
- [x] 1.4 Typecheck, lint, unit, e2e and interaction checks pass; the registry installs into a fresh Vite project
      without a provider
