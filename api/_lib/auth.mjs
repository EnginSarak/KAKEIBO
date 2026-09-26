import crypto from 'node:crypto';

const CERT_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let certCache = { expiresAt: 0, certs: null };

const isInvisible = (code) => code === 0xfeff || (code >= 0x200b && code <= 0x200d);

const clean = (value) => {
  if (typeof value !== 'string') return undefined;
  const stripped = Array.from(value)
    .filter((char) => !isInvisible(char.codePointAt(0)))
    .join('')
    .trim();
  return stripped.replace(/^(['"])(.*)\1$/, '$2').trim() || undefined;
};

export const projectId = () => {
  const value = clean(process.env.FIREBASE_PROJECT_ID) || clean(process.env.REACT_APP_FIREBASE_PROJECT_ID);
  if (!value) throw new Error('FIREBASE_PROJECT_ID is not set');
  return value;
};

const fetchCerts = async () => {
  const now = Date.now();
  if (certCache.certs && certCache.expiresAt > now) return certCache.certs;

  const response = await fetch(CERT_URL);
  if (!response.ok) throw new Error(`Unable to fetch Google signing certificates (${response.status})`);
  const certs = await response.json();

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number((cacheControl.match(/max-age=(\d+)/) || [])[1] || 3600);
  certCache = { certs, expiresAt: now + Math.min(maxAge, 86400) * 1000 };
  return certs;
};

const decodeSegment = (segment) => JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));

export const assertClaims = (payload, nowSeconds = Math.floor(Date.now() / 1000)) => {
  const project = projectId();
  const skew = 60;

  if (payload.aud !== project) throw new Error('Token audience mismatch');
  if (payload.iss !== `https://securetoken.google.com/${project}`) throw new Error('Token issuer mismatch');
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('Token has no subject');
  if (typeof payload.exp !== 'number' || payload.exp + skew < nowSeconds) throw new Error('Token expired');
  if (typeof payload.iat !== 'number' || payload.iat - skew > nowSeconds) throw new Error('Token issued in the future');
  if (typeof payload.auth_time === 'number' && payload.auth_time - skew > nowSeconds) {
    throw new Error('Token auth time in the future');
  }

  return payload;
};

export const verifyIdToken = async (token) => {
  if (typeof token !== 'string' || token.length === 0) throw new Error('Missing token');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  let header;
  let payload;
  try {
    header = decodeSegment(parts[0]);
    payload = decodeSegment(parts[1]);
  } catch {
    throw new Error('Malformed token');
  }

  if (header.alg !== 'RS256') throw new Error('Unexpected token algorithm');
  if (!header.kid) throw new Error('Token has no key id');

  const certs = await fetchCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error('Unknown token key id');

  const signatureValid = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    crypto.createPublicKey(cert),
    Buffer.from(parts[2], 'base64url'),
  );
  if (!signatureValid) throw new Error('Invalid token signature');

  assertClaims(payload);

  return payload;
};

export const requireOwner = async (req) => {
  const allowed = (process.env.ALLOWED_FIREBASE_UID || '').trim();
  if (!allowed) {
    const error = new Error('Bank sync is not configured');
    error.status = 503;
    throw error;
  }

  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(Array.isArray(header) ? header[0] : header);
  if (!match) {
    const error = new Error('Missing bearer token');
    error.status = 401;
    throw error;
  }

  let payload;
  try {
    payload = await verifyIdToken(match[1].trim());
  } catch (cause) {
    const error = new Error('Invalid token');
    error.status = 401;
    error.cause = cause;
    throw error;
  }

  if (payload.sub !== allowed) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  return payload;
};
