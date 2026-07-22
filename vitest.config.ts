import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  resolve: {
    alias: [
      { find: '@/design-system', replacement: r('./src/design-system') },
      { find: '@/lib', replacement: r('./src/lib') },
      { find: '@/components', replacement: r('./src/components') },
      { find: '@', replacement: r('.') },
    ],
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
