// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginNode from 'eslint-plugin-node';
import eslintPluginReact from 'eslint-plugin-react';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'eslint.config.ts',
      'index.html',
      'src/index.css',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js,jsx,css,scss}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
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
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier,
      import: eslintPluginImport,
      node: eslintPluginNode,
      react: eslintPluginReact,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended[0].rules,
      ...reactHooks.configs.recommended.rules,

      'react-refresh/only-export-components': [
        'warn',
        {allowConstantExport: true},
      ],

      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',
      'no-console': 'off',
      'import/no-unresolved': 'error',
      'node/no-missing-require': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,css,scss}'],
    rules: {
      'no-warning-comments': 'error',
    },
  },
);
