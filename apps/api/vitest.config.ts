import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The first app start per file is a cold start (~1 s); with all files in
    // parallel on a busy machine it has exceeded the 5 s default.
    testTimeout: 20_000,
  },
});
