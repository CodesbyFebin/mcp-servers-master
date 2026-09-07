import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    alias: {
      '@/*': path.resolve(__dirname, './src/*'),
      '@/src/*': path.resolve(__dirname, './src/*'),
      '@/src': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './src'),
    },
    resolve: {
      alias: {
        '@/*': path.resolve(__dirname, './src/*'),
        '@/src/*': path.resolve(__dirname, './src/*'),
        '@/src': path.resolve(__dirname, './src'),
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
});