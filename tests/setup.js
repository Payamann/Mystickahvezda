// Mock environment variables
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.PORT = 3002; // Use different port for testing mock server if needed

// Mock console.log/warn/error to reduce noise during tests (optional)
// global.console = { ...console, log: jest.fn(), warn: jest.fn() };

// Mock Supabase
import { jest } from '@jest/globals';

const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    // Add auth mock
    auth: {
        admin: {
            updateUserById: jest.fn()
        }
    }
};

// We need to mock the module 'server/db-supabase.js'
// Since Jest ESM mocking is different, we use unstable_mockModule in the test files usually.
// But we can try to mock it globally here if possible, or use __mocks__ folder.
// For ESM, 'unstable_mockModule' is preferred in individual test files or a global loader.

// Strategy: We will mock it in the individual test files using jest.unstable_mockModule
// because global setupFiles run before modules are loaded but ESM mocking happens at import time.
// So this setup.js is mostly for sync globals.

global.mockSupabaseClient = mockSupabase;
