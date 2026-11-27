import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test'
    },
    coverage: { provider: 'v8', include: ['src/**/*.js'], exclude: ['src/server.js'] }
  }
});
