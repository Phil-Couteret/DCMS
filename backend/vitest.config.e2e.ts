import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // No outgoing email, whatever the local .env says (it may point at a dev
    // mail catcher): tests that send email substitute their own mailer.
    // dotenv and Nest's config loader leave a variable that is already set.
    env: { SMTP_URL: '' },
  },
});
