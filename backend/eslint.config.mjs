import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import nodePlugin from 'eslint-plugin-node';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Base JavaScript rules
  js.configs.recommended,

  // Configuration for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        NodeJS: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        Express: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      node: nodePlugin,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-var-requires': 'off', // Allow require() for CommonJS
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // Node.js specific rules
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-missing-import': 'off', // TypeScript handles this
      'node/no-missing-require': 'off', // TypeScript handles this
      'node/no-unpublished-import': 'off',
      'node/no-unpublished-require': 'off',
      'node/no-extraneous-import': 'off', // npm handles this
      'node/no-extraneous-require': 'off', // npm handles this

      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/extensions': 'off', // TypeScript handles this

      // General JavaScript rules
      'no-console': 'off', // Allow console in backend
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': 'off', // Use TypeScript version instead
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs'],
      'comma-dangle': ['error', 'always-multiline'],
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],

      // Async/await rules
      'require-await': 'error',
      'no-return-await': 'error',

      // Security rules
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },

  // Configuration for JavaScript files
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      node: nodePlugin,
      import: importPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // Node.js specific rules
      'node/no-unsupported-features/es-syntax': 'off',

      // General JavaScript rules
      'no-console': 'off',
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      semi: ['error', 'always'],
      quotes: ['error', 'single'],

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },

  // Configuration for test files
  {
    files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'drizzle/**',
      '*.config.js',
      '*.config.mjs',
      'eslint.config.mjs',
    ],
  },

  // Apply Prettier config to disable conflicting rules
  prettierConfig,
];
