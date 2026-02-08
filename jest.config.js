export default {
    testEnvironment: 'node',
    transform: {}, // Disable transforms for ES Modules
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1', // Support extensionless imports if needed, or map .js
    },
    setupFiles: ['./tests/setup.js'], // Global mocks
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true,
    forceExit: true, // Force exit after tests finish (useful for Express)
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};
