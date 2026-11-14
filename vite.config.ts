import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/  ·  https://vitest.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Logic tests only (sim/, engine/, reports/). No DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
