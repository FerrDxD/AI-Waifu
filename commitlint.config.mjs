/**
 * Commit message convention (M1.1).
 *
 * Format: `<type>(<scope>): <subject>`
 * Contoh: `fix(security): tutup kebocoran API key di client`
 *
 * Dijalankan otomatis oleh hook `commit-msg` (husky).
 * Cek manual: `echo "feat: halo" | bunx commitlint`
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Bahasa bebas; yang dijaga hanya strukturnya.
    'subject-case': [0],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
  },
};
