export default {
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000, // 30 seconds for tests that process orders
    hookTimeout: 30000, // 30 seconds for beforeAll/afterAll hooks
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/'],
    },
  },
};

