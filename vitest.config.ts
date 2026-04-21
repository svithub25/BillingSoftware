import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'electron/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'dist-electron', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/components/Login.jsx', 'src/components/CreditDebitNote.jsx'],
      thresholds: {
        lines: 70,
        functions: 65,
        statements: 70,
        branches: 60
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'dist-electron/**',
        'e2e/**',
        '**/*.d.ts',
        'src/main.jsx',
        'electron/main.js'
      ]
    }
  }
});
