// Set default environment variables for tests
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/orderengine';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}
process.env.NODE_ENV = 'test';

// Skip database tests by default (set SKIP_DB_TESTS=false to run them)
// This prevents tests from failing when Docker isn't running
if (process.env.SKIP_DB_TESTS === undefined) {
  process.env.SKIP_DB_TESTS = 'true';
}

// Mock Prisma for tests that don't need real database
import { vi } from 'vitest';

// Only mock if database isn't available (for unit tests)
// Integration tests will use real database
if (process.env.SKIP_DB_TESTS !== 'true') {
  // This allows tests to run without database connection
  // Real database tests should set SKIP_DB_TESTS=false
}

