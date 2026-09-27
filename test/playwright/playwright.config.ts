import { defineConfig } from '@playwright/test';

// อยู่ใน test/ ตั้งใจ: tsconfig.build.json exclude "test" ไว้แล้ว ไฟล์นี้จึงไม่ถูกคอมไพล์เข้า dist/
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  workers: 1,
  reporter: [
    ['list'],
    ['junit', { outputFile: '../../reports/e2e-junit.xml' }],
    ['html', { outputFolder: '../../playwright-report', open: 'never' }],
  ],
  use: { baseURL: process.env.BASE_URL ?? 'http://localhost:3000' },
});
