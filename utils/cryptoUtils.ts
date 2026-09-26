// Cryptographic utilities using standard Web Crypto API (supported in all modern browsers and PWAs)

// Convert ArrayBuffer to hex string
export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to ArrayBuffer
export function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

// Generate random salt in hex
export function generateSalt(length = 16): string {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

// Hash password using PBKDF2 with SHA-256 (100,000 iterations)
export async function hashPassword(password: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const saltHex = existingSalt || generateSalt();
  const saltBuffer = hexToBuffer(saltHex);
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  return {
    hash: bufferToHex(derivedKey),
    salt: saltHex,
  };
}

// Verify password against stored hash & salt
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  try {
    const { hash } = await hashPassword(password, salt);
    return hash.toLowerCase() === storedHash.toLowerCase();
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

// Encrypt payload object with AES-GCM (256-bit) using key derived from password
export async function encryptPayload(data: any, password: string): Promise<{ ciphertext: string; salt: string; iv: string }> {
  const salt = generateSalt();
  const ivBytes = new Uint8Array(12);
  window.crypto.getRandomValues(ivBytes);
  const ivHex = bufferToHex(ivBytes.buffer);

  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const jsonString = JSON.stringify(data);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    aesKey,
    encoder.encode(jsonString)
  );

  return {
    ciphertext: bufferToHex(encryptedBuffer),
    salt,
    iv: ivHex,
  };
}

// Decrypt payload object with AES-GCM
export async function decryptPayload(ciphertextHex: string, password: string, saltHex: string, ivHex: string): Promise<any> {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToBuffer(saltHex),
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(hexToBuffer(ivHex)),
    },
    aesKey,
    hexToBuffer(ciphertextHex)
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString);
}
