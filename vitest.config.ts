import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Forward shell env vars so integration-style unit tests can reach the local server.
    env: {
      BASE_URL: process.env.BASE_URL ?? 'http://localhost:3000',
    },
  },
});
