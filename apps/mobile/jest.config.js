module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@spark/domain$': '<rootDir>/../../packages/domain/src/index.ts',
    '^@spark/cloud-contracts$':
      '<rootDir>/../../packages/cloud-contracts/src/index.ts'
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|expo-.*|@expo(nent)?/.*|expo-router|@spark/.*|@noble/.*)/)'
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'src/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      statements: 44,
      branches: 33,
      functions: 35,
      lines: 45
    }
  }
};
