// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'uploads/**', 'reports/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // promptpay-qr and qrcode are CommonJS without typings; the file loads them
    // with typed require() on purpose (see the comment at the top of that file).
    files: ['src/modules/payments/payment-info.controller.ts'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
