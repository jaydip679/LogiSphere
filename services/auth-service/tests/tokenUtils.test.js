const {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
} = require('../src/utils/tokenUtils');
const { UnauthorizedError } = require('@logisphere/common-utils');

describe('Auth Service — Token Utilities', () => {
  it('generates and verifies a valid RS256 access token', () => {
    const payload = {
      sub: 'usr_test_123',
      email: 'test@logisphere.local',
      role: 'CUSTOMER',
      accountType: 'INDIVIDUAL',
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.accountType).toBe(payload.accountType);
    expect(decoded.iss).toBe('logisphere-auth-service');
  });

  it('rejects an invalid or tampered access token', () => {
    const validToken = generateAccessToken({ sub: 'usr_1', role: 'CUSTOMER' });
    const tampered = validToken.slice(0, -6) + 'abcdef';

    expect(() => verifyAccessToken(tampered)).toThrow(UnauthorizedError);
  });

  it('generates random refresh tokens with sha256 hash', () => {
    const tokenObj = generateRefreshToken();

    expect(tokenObj.rawToken).toBeDefined();
    expect(tokenObj.tokenHash).toBeDefined();
    expect(tokenObj.expiresAt instanceof Date).toBe(true);

    const rehashed = hashToken(tokenObj.rawToken);
    expect(rehashed).toBe(tokenObj.tokenHash);
  });
});
