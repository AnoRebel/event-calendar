import tailwindcss from "@tailwindcss/vite"
import { readFileSync } from "node:fs"
import { prePaintScript } from "./app/lib/crystal-neuo/index.js"

const appVersion = (JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string }).version

// Analytics site IDs are resolved at BUILD time. nuxt-umami bakes its site id into
// a generated config during the module setup hook, so setting NUXT_UMAMI_SITE_ID
// only at runtime has no effect — it must be present in the build environment.
// We keep the project-standard name NUXT_UMAMI_SITE_ID here and feed it to the
// module (which internally also accepts NUXT_UMAMI_ID); if it is missing the build
// warns loudly instead of silently shipping a non-tracking ("faux mode") build.
const umamiSiteId = process.env.NUXT_UMAMI_SITE_ID || ""
const rybbitSiteId = process.env.NUXT_RYBBIT_SITE_ID || ""
const analyticsEnabled = process.env.NUXT_PUBLIC_ENABLE_ANALYTICS !== "false"

// Feature flags: default OFF; an unset or unrecognized value resolves to false.
// Read here so values flow into runtimeConfig.public and are resolvable at runtime
// (NUXT_PUBLIC_* env overrides work without a rebuild).
const flag = (value: string | undefined): boolean => value === "true" || value === "1"

if (analyticsEnabled && !umamiSiteId) {
  console.warn(
    "[analytics] NUXT_UMAMI_SITE_ID is not set at build time — Umami will run in faux mode and track nothing. Set it in the build environment (not just at runtime).",
  )
}

// Crystal Neuo: give <html> the default axes, then apply the visitor's stored
// appearance (validated by the runtime) before first paint. The attributes are
// deliberately not bound through Vue/Unhead, which would reset them on hydration.
const appearanceScript =
  `(()=>{var d=document.documentElement.dataset;d.material||(d.material="refraction");` +
  `d.platform||(d.platform="web");d.density||(d.density="comfortable");` +
  `d.theme||(d.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light")})();` +
  prePaintScript

// Each material's display, text and numeric faces (system fallbacks are built
// into the tokens, so nothing breaks if these fail to load).
const fontsHref =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800" +
  "&family=Doto:wght@600;800&family=Figtree:wght@400..800&family=Geist:wght@400..800" +
  "&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600;700" +
  "&family=JetBrains+Mono:wght@400;600&display=swap"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-08-16",
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 5
  },

  // Performance optimizations
  nitro: {
    compressPublicAssets: true,
    experimental: {
      websocket: true,
      tasks: true
    },
    // Reset the demo account's data once a day (00:00) so the public demo stays
    // tidy. The task itself no-ops when demo mode is disabled.
    scheduledTasks: {
      "0 0 * * *": ["demo:reset"],
    },
    // Pages depend on the session, so they are server-rendered per request (a
    // prerendered "/" would freeze the signed-out state into the HTML).
    prerender: {
      crawlLinks: false,
    },
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/icon",
    "shadcn-nuxt",
    "@vueuse/nuxt",
    "@nuxt/image",
    "@nuxt/scripts",
    "nuxt-umami",
    "@vue-dnd-kit/nuxt",
    "nuxt-auth-utils",
    "nuxt-authorization",
    "@nuxt/content",
  ],

  // In-app documentation (content/docs → /docs). Node's built-in SQLite keeps the
  // index without a native dependency; code is highlighted at build time.
  content: {
    experimental: { sqliteConnector: "native" },
    build: {
      markdown: {
        toc: { depth: 3, searchDepth: 3 },
        highlight: {
          theme: { default: "github-light", dark: "github-dark" },
          langs: ["bash", "ts", "js", "vue", "vue-html", "json", "yaml", "css", "html", "sql", "dockerfile", "ini"],
        },
      },
    },
  },

  // CSS optimization
  css: ["~/assets/css/main.css"],

  // Build optimization
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["date-fns", "vue-sonner", "uuid"],
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#EEF0F5", media: "(prefers-color-scheme: light)" },
        { name: "theme-color", content: "#0D0F15", media: "(prefers-color-scheme: dark)" },
        { name: "color-scheme", content: "light dark" },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: fontsHref },
      ],
      // Rybbit: only inject the tracker when a site id is configured and analytics
      // are enabled. Behavior (endpoint + site id) is preserved from before; the
      // site id is now resolved once above rather than read inline.
      script: [
        // Blocking on purpose: must run before the first paint.
        { innerHTML: appearanceScript, tagPosition: "head", tagPriority: "critical" },
        ...(analyticsEnabled && rybbitSiteId
          ? [
              {
                src: "https://rybbit.anorebel.net/api/script.js",
                defer: true,
                "data-site-id": rybbitSiteId,
              },
            ]
          : []),
      ],
    },
  },

  umami: {
    id: umamiSiteId,
    host: "https://umami.anorebel.net",
    autoTrack: true,
    proxy: "cloak",
    enabled: analyticsEnabled,
    logErrors: true,
  },

  // Passkeys (WebAuthn) via nuxt-auth-utils + @simplewebauthn.
  auth: {
    webAuthn: true,
  },

  // Runtime config for environment variables
  runtimeConfig: {
    // Private keys (only available on server-side).
    // libSQL connection, read at runtime so the URL/token are configurable per
    // environment without a rebuild. For self-hosted sqld without auth, set only
    // the URL (http://host:port) and leave the token empty.
    libsql: {
      url: process.env.LIBSQL_URL || "file:./.data/events.db",
      authToken: process.env.LIBSQL_AUTH_TOKEN || "",
    },
    // Registration policy. Default: invite/seed-only (openRegistration=false) —
    // registration requires a valid invite token, except the very first user
    // (bootstrap) when the users table is empty. Set to true to allow open
    // public registration. Read at runtime.
    openRegistration: flag(process.env.OPEN_REGISTRATION),

    // Demo mode: a shared, prefilled account for one-click sign-in, seeded with
    // dummy events that a scheduled task periodically resets. Off by default.
    demo: {
      enabled: flag(process.env.DEMO_MODE),
      email: process.env.DEMO_EMAIL || "demo@event-calendar.app",
      password: process.env.DEMO_PASSWORD || "demo-calendar-1234",
      // How often the demo account's data is reset (minutes) — informational; the
      // actual schedule is the daily cron in nitro.scheduledTasks. Default 24h.
      resetMinutes: Number.parseInt(process.env.DEMO_RESET_MINUTES || "1440", 10) || 1440,
    },

    // NOTE: analytics site IDs are resolved at build time (see top of file) —
    // nuxt-umami bakes its id in during setup and Rybbit is injected via app.head —
    // so there are intentionally no runtime umami/rybbit entries here.

    // Public keys (exposed to client-side)
    public: {
      enableAnalytics: process.env.NUXT_PUBLIC_ENABLE_ANALYTICS !== "false",
      version: appVersion,
      // Feature flags — default off; gate both UI and (where relevant) the server.
      // FEATURE_* sets the build-time default; NUXT_PUBLIC_FEATURES_* overrides it
      // at runtime without a rebuild (Nuxt's runtime-config convention).
      features: {
        recurringEvents: flag(process.env.FEATURE_RECURRING_EVENTS),
        collaboration: flag(process.env.FEATURE_COLLABORATION),
      },
    },
  },

  // Security headers
  routeRules: {
    "/**": {
      headers: {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
    },
  },

  // Image optimization
  image: {
    quality: 80,
    format: ["webp", "avif"],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },

  // TypeScript: Nuxt 4 project references (see tsconfig.json). The optional
  // registry layers (data/persistence/realtime) are distribution templates for
  // consumers — they use consumer-relative imports, so they are not app code.
  typescript: {
    tsConfig: {
      // Match the strictness of a fresh Vite + Vue project, so the registry
      // calendar compiles cleanly wherever it's installed.
      compilerOptions: { noUnusedLocals: true, noUnusedParameters: true },
      exclude: [
        "../app/registry/event-calendar-data",
        "../app/registry/event-calendar-persistence",
        "../app/registry/event-calendar-realtime",
      ],
    },
  },

  // Components: shadcn-nuxt registers components/ui itself, so the default
  // scan skips that folder (otherwise every index.ts collides with its .vue).
  components: [{ path: "~/components", pathPrefix: false, ignore: ["ui/**"] }],

  // Component configuration
  shadcn: {
    prefix: "",
    componentDir: "./app/components/ui",
  },

  // Experimental features
  experimental: {
    // compatibilityVersion 5 turns Nitro's h3 auto-imports off. Our server code
    // imports h3/nitropack explicitly, but third-party modules (nuxt-authorization)
    // still import h3 utils from `#imports`, so keep the presets enabled.
    nitroAutoImports: true,
    payloadExtraction: false,
    renderJsonPayloads: true,
  },
})
