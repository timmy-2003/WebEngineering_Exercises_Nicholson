import love from 'eslint-config-love';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default [
  {
    ignores: ['dist/**'],
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
  prettierRecommended,
];
