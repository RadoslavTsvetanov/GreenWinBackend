/* eslint-disable @typescript-eslint/no-require-imports */
const { defineConfig, globalIgnores } = require('eslint/config');
const tsParser = require('@typescript-eslint/parser');
const typescriptEslintEslintPlugin = require('@typescript-eslint/eslint-plugin');
const _import = require('eslint-plugin-import');
const { fixupPluginRules } = require('@eslint/compat');
const globals = require('globals');
const js = require('@eslint/js');
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([
  {
    languageOptions: {
      parser: tsParser,
      sourceType: 'module',

      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },

      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },

    plugins: {
      '@typescript-eslint': typescriptEslintEslintPlugin,
      import: fixupPluginRules(_import),
    },

    extends: compat.extends(
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ),

    settings: {
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx'],
        },
      },
    },

    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',

      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],

      'import/order': [
        'error',
        {
          pathGroups: [
            {
              pattern: '@app/**',
              group: 'external',
              position: 'after',
            },
          ],

          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
        },
      ],
    },
  },
  globalIgnores([
    '**/.eslintrc.js',
    '**/dist',
    '**/node_modules',
    '**/migrations/*.ts',
  ]),
]);