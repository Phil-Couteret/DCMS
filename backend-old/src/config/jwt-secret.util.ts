/**
 * Returns the JWT signing secret from the environment.
 *
 * Throws at module-load time (i.e. app boot) if JWT_SECRET is not set, instead
 * of silently falling back to a hardcoded default. The old fallback
 * ('your-secret-key-change-in-production') was committed to git, so any
 * deployment that forgot to set JWT_SECRET was trivially forgeable.
 */
export function getRequiredJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET environment variable is required and must not be empty. ' +
        'Set it in backend/.env (local) or as a secret in your deployment ' +
        'environment (docker-compose .env, K8s Secret, etc.) before starting the app.',
    );
  }
  return secret;
}
