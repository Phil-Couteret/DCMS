/**
 * Phase 6.9 (roadmap item 9): pino-http options, extracted out of
 * app.module.ts so the level/redact/transport logic can be unit-tested
 * without booting the full Nest app (which needs a real Prisma client -
 * not always available, see docs/roadmap.md Phase 6.7/6.8's notes on this
 * sandbox's blocked binaries.prisma.sh access).
 */
export function buildPinoHttpOptions(env: NodeJS.ProcessEnv = process.env) {
  const isProduction = env.NODE_ENV === 'production';

  return {
    level: env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    // One line per completed HTTP request (method, url, status, response
    // time) via pino-http's autoLogging - separate from, and in addition
    // to, the detailed error-path logging already done in
    // AllExceptionsFilter (which also redacts sensitive body fields).
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
    // JSON to stdout in production (what the container log collector
    // expects); pino-pretty for readable colored dev output otherwise.
    transport: isProduction
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
  };
}
