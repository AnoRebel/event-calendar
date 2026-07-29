import { users } from "../../db/schema"

// GET /api/auth/status — public. Tells the client how registration should behave
// so the UI can adapt (bootstrap the first account, show/hide the invite field,
// offer demo login) without leaking anything sensitive.
export default defineEventHandler(async () => {
  const { openRegistration, demo } = useRuntimeConfig()

  let needsBootstrap = false
  try {
    needsBootstrap = (await useDb().$count(users)) === 0
  } catch {
    // If the DB isn't reachable yet, don't claim bootstrap.
    needsBootstrap = false
  }

  return {
    // First account can be created freely (empty users table).
    needsBootstrap,
    // Whether registration is open to everyone (no invite needed).
    openRegistration: !!openRegistration,
    // Whether a demo account is available for one-click sign-in.
    demoEnabled: !!demo?.enabled,
    demoEmail: demo?.enabled ? demo.email : undefined,
  }
})
