// eslint.config.ts
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginReact from 'eslint-plugin-react';
import {defineConfig, globalIgnores} from 'eslint/config';

/** React Compiler / R3F rules that conflict with Three.js + @react-three/fiber patterns. */
const r3fCompilerRulesOff = {
  'react-hooks/refs': 'off',
  'react-hooks/immutability': 'off',
  'react-hooks/static-components': 'off',
} as const;

export default defineConfig([
  globalIgnores(['dist', 'node_modules', '**/node_modules/**']),
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss'],
        },
      },
      react: {
        version: 'detect',
      },
    },
    plugins: {
      prettier,
      import: eslintPluginImport,
      react: eslintPluginReact,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'prettier/prettier': 'error',

      'no-console': 'off',
      'import/no-unresolved': 'error',
      'import/no-deprecated': 'warn',
      'no-unused-vars': 'off',
      'no-warning-comments': 'warn',
      'no-nested-ternary': 'off',
      'no-useless-assignment': 'off',

      // REACT (aligned with mbt/eslint.config.js)
      'react/react-in-jsx-scope': 'off',
      'react/jsx-no-useless-fragment': 'off',
      'react/no-deprecated': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        {allowConstantExport: true},
      ],

      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/immutability': 'off',

      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/components/Filters_And_MediaOutput/**/*.{ts,tsx}'],
    rules: r3fCompilerRulesOff,
  },
  {
    // Fix applied to this block targeting config files
    files: ['*.{ts,js}', '*.config.{ts,js}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
      parser: tseslint.parser,
      // Added project and tsconfigRootDir here:
      parserOptions: {
        project: './tsconfig.node.json', // OR './tsconfig.json' depending on where eslint.config.ts is included
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
    },
  },
]);