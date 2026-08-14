import { defineConfig } from 'vite'

export default defineConfig({
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
