// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt(
  // Generated or vendored code: built registry output and Crystal Neuo's runtime.
  { ignores: ["public/r/**", "app/lib/crystal-neuo/**", "e2e/artifacts/**"] },
  {
    rules: {
      // Optional props typed in TypeScript (shadcn-vue's `class?:` pattern) are
      // intentionally undefined by default.
      "vue/require-default-prop": "off",
    },
  },
)
