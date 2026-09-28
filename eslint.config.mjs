import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactNativePlugin from 'eslint-plugin-react-native';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'dist/**',
      // Edge Functions Deno: tipos/globals Deno, fuera del lint app
      // (igual que se scoteó src/lib/push/** por sus globals web).
      'supabase/functions/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        __DEV__: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-native': reactNativePlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'prettier/prettier': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Web-only push helpers: plain Web APIs (Service Worker, navigator), no
  // react-native. Checked by tsc (DOM lib); teach eslint the globals here so
  // T1/T3 don't trip no-undef. Scoped to this dir on purpose.
  {
    files: ['src/lib/push/**/*.ts'],
    languageOptions: {
      globals: {
        window: 'readonly',
        navigator: 'readonly',
        self: 'readonly',
        ServiceWorkerRegistration: 'readonly',
        Navigator: 'readonly',
        PushSubscription: 'readonly',
        Notification: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
      },
    },
  },
];
