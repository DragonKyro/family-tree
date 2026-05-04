import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { familyApiPlugin } from './server/vitePlugin'

export default defineConfig({
  plugins: [react(), familyApiPlugin()],
  server: {
    open: true,
  },
})
