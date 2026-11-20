const { createLogger } = require('../src');

describe('Logger Package', () => {
  it('creates a winston logger instance with service default metadata', () => {
    const logger = createLogger('test-service');
    expect(logger).toBeDefined();
    expect(logger.defaultMeta).toEqual({ service: 'test-service' });
  });

  it('masks sensitive fields like password, token, authorization, secret', () => {
    const logger = createLogger('test-service');
    let loggedOutput = null;

    logger.transports.forEach((t) => {
      t.write = (info) => {
        loggedOutput = info;
      };
    });

    logger.info('User authentication attempt', {
      user: 'john_doe',
      password: 'superSecretPassword123',
      token: 'jwt-access-token-xyz',
      nested: {
        authorization: 'Bearer sensitive-token',
        clientSecret: 'shhh-secret',
        safeField: 'visible-value',
      },
    });

    expect(loggedOutput).toBeDefined();
    expect(loggedOutput.password).toBe('***MASKED***');
    expect(loggedOutput.token).toBe('***MASKED***');
    expect(loggedOutput.nested.authorization).toBe('***MASKED***');
    expect(loggedOutput.nested.clientSecret).toBe('***MASKED***');
    expect(loggedOutput.nested.safeField).toBe('visible-value');
  });
});
