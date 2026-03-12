/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          module: 'esnext',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          paths: { '@/*': ['./*'] },
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@google/genai$': '<rootDir>/node_modules/@google/genai',
    '^@supabase/supabase-js$': '<rootDir>/node_modules/@supabase/supabase-js',
    '^ws$': '<rootDir>/server/node_modules/ws',
    // Resolve ESM .js imports to .ts source files for Jest (CommonJS transform)
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'server/**/*.ts',
    '!lib/hooks/**',
    '!lib/audio-streamer.ts',
    '!server/gemini-relay.ts',
    '!server/index.ts',
    '!server/prompt-bridge.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = config;
