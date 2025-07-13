import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: '@cloudflare/vitest-pool-workers',
    pool: '@cloudflare/vitest-pool-workers',
  },
});