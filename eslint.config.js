import love from 'eslint-config-love';
import angular from 'angular-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: ['dist/**', '.angular/**'],
  },
  {
    ...love,
    files: ['src/**/*.ts', 'src/**/*.js'],
    rules: {
      ...love.rules,
      // `0` and `1` show up constantly as array-first-element / empty-check literals (e.g.
      // `entries.length === 0`, `imageinfo[0]`) - they carry no meaning that a named constant
      // would clarify. Every other numeric literal (like the wiki section index) stays flagged.
      '@typescript-eslint/no-magic-numbers': ['error', { ignore: [0, 1] }],
    },
  },
  // Angular-specific rules for component/service classes (selectors, lifecycle usage, signal
  // inputs/outputs, ...). `processInlineTemplates` extracts inline `template:` strings so the
  // template rules below also see them.
  ...angular.configs.tsRecommended.map((config) => ({
    ...config,
    files: ['src/**/*.ts'],
  })),
  {
    files: ['src/**/*.ts'],
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
  // Template rules (including the accessibility set) for `.html` templates and inline templates.
  ...[
    ...angular.configs.templateRecommended,
    ...angular.configs.templateAccessibility,
  ].map((config) => ({ ...config, files: ['src/**/*.html'] })),
  // Prettier only runs through ESLint for TypeScript; templates are formatted by Prettier
  // directly (with the `angular` parser, see .prettierrc.json), because the plain HTML parser
  // ESLint would hand them to doesn't understand Angular's `@if`/`@for` block syntax.
  { ...prettierRecommended, files: ['src/**/*.ts', 'src/**/*.js'] },
];
