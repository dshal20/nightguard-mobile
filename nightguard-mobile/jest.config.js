/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
