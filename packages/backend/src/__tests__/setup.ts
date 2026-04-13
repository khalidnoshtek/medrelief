import { vi } from 'vitest';

// Set test environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-minimum-8';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
