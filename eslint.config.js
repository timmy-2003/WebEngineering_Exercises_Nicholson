import love from 'eslint-config-love';
import angular from 'angular-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: ['**/dist/**', '**/.angular/**', '**/node_modules/**'],
  },
  {
    ...love,
    files: [
      'apps/*/src/**/*.ts',
      'apps/*/src/**/*.js',
      'apps/api/test/**/*.ts',
      'apps/api/*.ts',
    ],
    rules: {
      ...love.rules,
      '@typescript-eslint/no-magic-numbers': ['error', { ignore: [0, 1] }],
    },
  },
  {
    files: ['apps/api/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/init-declarations': 'off',
    },
  },

  ...angular.configs.tsRecommended.map((config) => ({
    ...config,
    files: ['apps/web/src/**/*.ts'],
  })),
  {
    files: ['apps/web/src/**/*.ts'],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
    },
  },
  ...[
    ...angular.configs.templateRecommended,
    ...angular.configs.templateAccessibility,
  ].map((config) => ({ ...config, files: ['apps/web/src/**/*.html'] })),

  {
    ...prettierRecommended,
    files: [
      'apps/*/src/**/*.ts',
      'apps/*/src/**/*.js',
      'apps/api/test/**/*.ts',
      'apps/api/*.ts',
    ],
  },
];
