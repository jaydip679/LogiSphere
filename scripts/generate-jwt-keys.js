const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const generateKeys = () => {
  console.info('Generating RS256 RSA 2048-bit key pair for JWT authentication...');

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const authSecretsDir = path.resolve(__dirname, '../services/auth-service/secrets');
  const sharedKeysDir = path.resolve(__dirname, '../shared/keys');

  if (!fs.existsSync(authSecretsDir)) {
    fs.mkdirSync(authSecretsDir, { recursive: true });
  }

  if (!fs.existsSync(sharedKeysDir)) {
    fs.mkdirSync(sharedKeysDir, { recursive: true });
  }

  const privateKeyPath = path.join(authSecretsDir, 'jwt-private.key');
  const publicKeyPath = path.join(sharedKeysDir, 'jwt-public.key');

  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
  fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

  console.info(`✓ Private key successfully written to: ${privateKeyPath}`);
  console.info(`✓ Public key successfully written to: ${publicKeyPath}`);
};

if (require.main === module) {
  generateKeys();
}

module.exports = { generateKeys };
