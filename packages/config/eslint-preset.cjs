/**
 * Shared ESLint config for Nexora HRMS apps and packages.
 * Strict TypeScript; flags unused vars, explicit `any`, and forbidden patterns.
 */

module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'error',
    eqeqeq: ['error', 'smart'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.object.name="JSON"][callee.property.name="parse"]',
        message: 'Use a zod schema or a typed parser instead of raw JSON.parse.',
      },
    ],
  },
  ignorePatterns: ['dist/', '.next/', 'build/', 'node_modules/'],
};
