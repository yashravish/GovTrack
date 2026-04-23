module.exports = {
  preset: 'detox',
  testTimeout: 180000,
  testMatch: ['**/*.e2e.ts'],
  setupFilesAfterEnv: ['<rootDir>/init.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
