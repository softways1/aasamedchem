const SECRET = process.env.SESSION_SECRET || 'aasamedchem_super_secret_session_token_key_12345';

/**
 * Hash password using SHA-256 (via Web Crypto)
 * @param {string} password 
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SECRET); // added secret salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sign session payload using HMAC-SHA256
 * @param {object} payload 
 * @returns {Promise<string>} token
 */
export async function signSession(payload) {
  const payloadStr = JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }); // 24 hours expiry
  const encoder = new TextEncoder();
  
  // Create HMAC key
  const keyData = encoder.encode(SECRET);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const payloadData = encoder.encode(payloadStr);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Format: base64(payload).signatureHex
  const payloadB64 = Buffer.from(payloadStr).toString('base64');
  return `${payloadB64}.${signatureHex}`;
}

/**
 * Verify session token and return payload
 * @param {string} token 
 * @returns {Promise<object|null>} payload
 */
export async function verifySession(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  
  const [payloadB64, signatureHex] = parts;
  const payloadStr = Buffer.from(payloadB64, 'base64').toString('utf8');
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  
  // Check signature
  const payloadData = encoder.encode(payloadStr);
  const signatureBytes = new Uint8Array(
    signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
  
  const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, payloadData);
  if (!isValid) return null;
  
  try {
    const payload = JSON.parse(payloadStr);
    if (Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}
