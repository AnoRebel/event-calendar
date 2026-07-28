/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    // e2e/ holds bunwright specs that run under `bun:test` (via `bun test e2e/`),
    // not vitest — exclude them so `vitest run` doesn't try to bundle `bun:test`.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.output/**', '.nuxt/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './app'),
      '~': resolve(__dirname, './app'),
    }
  }
})