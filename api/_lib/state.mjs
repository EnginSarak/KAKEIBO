import crypto from 'node:crypto';

const STATE_TTL_SECONDS = 5400;
const SESSION_COOKIE = 'kakeibo_bank_session';
const SESSION_TTL_SECONDS = 600;

const secret = () => {
  const value = process.env.BANK_STATE_SECRET;
  if (!value || value.length < 32) throw new Error('BANK_STATE_SECRET is not set or too short');
  return value;
};

const sign = (payload, purpose) =>
  crypto.createHmac('sha256', secret()).update(`${purpose}.${payload}`).digest('base64url');

const pack = (data, purpose, ttlSeconds) => {
  const body = { ...data, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payload = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${payload}.${sign(payload, purpose)}`;
};

const unpack = (value, purpose) => {
  if (typeof value !== 'string') throw new Error('Missing signed value');
  const index = value.lastIndexOf('.');
  if (index <= 0) throw new Error('Malformed signed value');

  const payload = value.slice(0, index);
  const provided = value.slice(index + 1);
  const expected = sign(payload, purpose);

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Bad signature');

  let body;
  try {
    body = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Malformed signed value');
  }

  if (typeof body.exp !== 'number' || body.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Signed value expired');
  }

  return body;
};

export const packState = (uid) => pack({ uid }, 'state', STATE_TTL_SECONDS);
export const unpackState = (value) => unpack(value, 'state');

export const sessionCookie = (sessionId) => {
  const value = pack({ sessionId }, 'session', SESSION_TTL_SECONDS);
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
};

export const clearedSessionCookie = () =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export const readSessionCookie = (req) => {
  const raw = req.headers?.cookie || '';
  const entry = raw
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!entry) throw new Error('No session cookie');
  return unpack(entry.slice(SESSION_COOKIE.length + 1), 'session').sessionId;
};
