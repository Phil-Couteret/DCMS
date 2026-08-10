import { buildPinoHttpOptions } from './pino-http.config';

describe('buildPinoHttpOptions', () => {
  it('defaults to level "info" and no pretty-print transport in production', () => {
    const options = buildPinoHttpOptions({ NODE_ENV: 'production' } as NodeJS.ProcessEnv);
    expect(options.level).toBe('info');
    expect(options.transport).toBeUndefined();
  });

  it('defaults to level "debug" and a pino-pretty transport outside production', () => {
    const options = buildPinoHttpOptions({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(options.level).toBe('debug');
    expect(options.transport).toEqual({
      target: 'pino-pretty',
      options: { colorize: true, singleLine: true },
    });
  });

  it('LOG_LEVEL overrides the NODE_ENV-based default in either environment', () => {
    expect(buildPinoHttpOptions({ NODE_ENV: 'production', LOG_LEVEL: 'warn' } as NodeJS.ProcessEnv).level).toBe('warn');
    expect(buildPinoHttpOptions({ NODE_ENV: 'development', LOG_LEVEL: 'trace' } as NodeJS.ProcessEnv).level).toBe('trace');
  });

  it('redacts authorization/cookie headers so credentials never reach the logs', () => {
    const options = buildPinoHttpOptions({} as NodeJS.ProcessEnv);
    expect(options.redact.paths).toEqual(
      expect.arrayContaining([
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
      ]),
    );
    expect(options.redact.censor).toBe('[REDACTED]');
  });
});
