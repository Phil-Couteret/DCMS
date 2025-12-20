// Password Hashing Utility for GDPR Compliance
// Uses Web Crypto API for secure password hashing

/**
 * Hash a password using PBKDF2 (Web Crypto API)
 * This is a client-side hashing function. In production with a backend,
 * passwords should be hashed server-side using bcrypt or similar.
 * 
 * @param {string} password - Plain text password
 * @param {string} salt - Salt (optional, will generate if not provided)
 * @returns {Promise<{hash: string, salt: string}>}
 */
export const hashPassword = async (password, salt = null) => {
  // Generate salt if not provided
  const saltBytes = salt 
    ? Uint8Array.from(atob(salt), c => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));
  
  const saltBase64 = salt || btoa(String.fromCharCode(...saltBytes));
  
  // Convert password to ArrayBuffer
  const passwordBuffer = new TextEncoder().encode(password);
  
  // Import password as key
  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256'
    },
    key,
    256 // 256 bits = 32 bytes
  );
  
  // Convert to base64
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  
  return {
    hash: hashBase64,
    salt: saltBase64
  };
};

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password to verify
 * @param {string} hash - Stored hash
 * @param {string} salt - Stored salt
 * @returns {Promise<boolean>}
 */
export const verifyPassword = async (password, hash, salt) => {
  try {
    const { hash: computedHash } = await hashPassword(password, salt);
    return computedHash === hash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

/**
 * Store hashed password in customer object
 * Format: "hash:salt" for easy storage/retrieval
 */
export const storeHashedPassword = async (password) => {
  const { hash, salt } = await hashPassword(password);
  return `${hash}:${salt}`;
};

/**
 * Extract hash and salt from stored format
 */
export const parseStoredPassword = (stored) => {
  if (!stored) return { hash: null, salt: null };
  const parts = stored.split(':');
  if (parts.length !== 2) {
    // Legacy plaintext password - return as-is for backward compatibility
    return { hash: stored, salt: null, isPlaintext: true };
  }
  return { hash: parts[0], salt: parts[1], isPlaintext: false };
};

/**
 * Check if stored password is plaintext (legacy) or hashed
 */
export const isPasswordHashed = (stored) => {
  if (!stored) return false;
  return stored.includes(':') && stored.split(':').length === 2;
};

// Default export
const passwordHash = {
  hashPassword,
  verifyPassword,
  storeHashedPassword,
  parseStoredPassword,
  isPasswordHashed
};

export default passwordHash;

