import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';

// The key identifies the partner and may be shown again; the secret is its
// password, stored only as a bcrypt hash and shown once.
export async function newCredentials() {
  const apiKey = `pk_${randomBytes(16).toString('hex')}`;
  const apiSecret = `sk_${randomBytes(24).toString('base64url')}`;
  return { apiKey, apiSecret, apiSecretHash: await bcrypt.hash(apiSecret, 12) };
}

// Compared against when no partner matches, so a wrong email or key takes as
// long as a wrong secret.
export const DUMMY_HASH = bcrypt.hashSync('no-such-partner', 12);
