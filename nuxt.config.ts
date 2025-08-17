import tailwindcss from "@tailwindcss/vite"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-08-16",
  devtools: { enabled: true },

  // Performance optimizations
  nitro: {
    compressPublicAssets: true,
    prerender: {
      crawlLinks: true,
      routes: ["/"],
    },
    routeRules: {
      "/": { prerender: true },
      "/api/**": { cors: true, headers: { "Access-Control-Allow-Origin": "*" } },
    },
  },

  modules: ["@nuxt/eslint", "@nuxt/icon", "shadcn-nuxt", "@vueuse/nuxt", "@nuxt/image"],

  // CSS optimization
  css: ["~/assets/css/main.css"],

  // Build optimization
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "date-fns": ["date-fns"],
            "vue-sonner": ["vue-sonner"],
            uuid: ["uuid"],
          },
        },
      },
    },
    optimizeDeps: {
      include: ["date-fns", "vue-sonner", "uuid"],
    },
  },

  // Runtime config for environment variables
  runtimeConfig: {
    // Private keys (only available on server-side)
    secretKey: process.env.SECRET_KEY,
    databaseUrl: process.env.DATABASE_URL,

    // Public keys (exposed to client-side)
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api",
      enableAnalytics: process.env.NUXT_PUBLIC_ENABLE_ANALYTICS === "true",
      version: process.env.npm_package_version || "1.0.0",
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

  // TypeScript configuration
  typescript: {
    strict: false,
    typeCheck: false,
  },
})
