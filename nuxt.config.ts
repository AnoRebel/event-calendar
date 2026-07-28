import tailwindcss from "@tailwindcss/vite"

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
    prerender: {
      crawlLinks: true,
      routes: ["/"],
    },
    routeRules: {
      "/": { prerender: true },
      "/api/**": { cors: true, headers: { "Access-Control-Allow-Origin": "*" } },
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
  ],

  // CSS optimization
  css: ["~/assets/css/main.css"],

  // Build optimization
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes("node_modules/date-fns")) return "date-fns"
            if (id.includes("node_modules/vue-sonner")) return "vue-sonner"
            if (id.includes("node_modules/uuid")) return "uuid"
          },
        },
      },
    },
    optimizeDeps: {
      include: ["date-fns", "vue-sonner", "uuid"],
    },
  },

  app: {
    head: {
      // Rybbit: only inject the tracker when a site id is configured and analytics
      // are enabled. Behavior (endpoint + site id) is preserved from before; the
      // site id is now resolved once above rather than read inline.
      script:
        analyticsEnabled && rybbitSiteId
          ? [
              {
                src: "https://rybbit.anorebel.net/api/script.js",
                defer: true,
                "data-site-id": rybbitSiteId,
              },
            ]
          : [],
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

    // NOTE: analytics site IDs are resolved at build time (see top of file) —
    // nuxt-umami bakes its id in during setup and Rybbit is injected via app.head —
    // so there are intentionally no runtime umami/rybbit entries here.

    // Public keys (exposed to client-side)
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
      enableAnalytics: process.env.NUXT_PUBLIC_ENABLE_ANALYTICS !== "false",
      version: process.env.npm_package_version || "1.0.0",
      // Feature flags — default off; gate both UI and (where relevant) the server.
      features: {
        recurringEvents: flag(process.env.NUXT_PUBLIC_FEATURE_RECURRING_EVENTS ?? process.env.FEATURE_RECURRING_EVENTS),
        collaboration: flag(process.env.NUXT_PUBLIC_FEATURE_COLLABORATION ?? process.env.FEATURE_COLLABORATION),
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

  // Component configuration
  shadcn: {
    prefix: "",
    componentDir: "./components/ui",
  },

  // Experimental features for performance
  experimental: {
    payloadExtraction: false,
    renderJsonPayloads: true,
  },
})
