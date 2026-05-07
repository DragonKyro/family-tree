import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Repo is published at https://dragonkyro.github.io/family-tree/, so prod
// asset URLs need the /family-tree/ prefix. Dev still serves from /.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/family-tree/' : '/',
  server: {
    open: true,
  },
}))
