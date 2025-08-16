// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs"
import playwright from "eslint-plugin-playwright"

export default withNuxt({
  // Your custom configs here
}, playwright.configs["flat/recommended"])
