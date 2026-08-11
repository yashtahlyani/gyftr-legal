import { defineConfig } from 'vite'

export default defineConfig({
  // amazon-cognito-identity-js references Node's `global`
  define: {
    global: 'globalThis',
  },
  server: {
    port: 7979,
  },
  preview: {
    port: 7979,
  },
  build: {
    // Target a modern baseline so top-level await in entry modules is supported.
    target: 'esnext',
    rollupOptions: {
      input: {
        main: 'index.html',
        app:  'app.html'
      }
    }
  }
})
