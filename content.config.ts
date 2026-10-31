import { defineCollection, defineContentConfig } from "@nuxt/content"
import * as v from "valibot"

// In-app documentation (content/docs/**), rendered at /docs.
export default defineContentConfig({
  collections: {
    docs: defineCollection({
      type: "page",
      source: { include: "docs/**/*.md", prefix: "/docs" },
      schema: v.object({
        /** Short label for the sidebar (defaults to the title). */
        navTitle: v.optional(v.string()),
        /** Lucide icon name shown next to the page in the sidebar. */
        icon: v.optional(v.string()),
      }),
    }),
  },
})
