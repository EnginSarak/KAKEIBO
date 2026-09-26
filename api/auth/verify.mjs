import crypto from 'node:crypto';
import { templates } from '../_lib/mail-templates.mjs';
import { verifyIdToken } from '../_lib/auth.mjs';

const PROJECT = 'kakeibo-application1';
const APP_URL = process.env.BANK_APP_URL || 'https://kakeibo.enginsarak.com';
const FROM = process.env.MAIL_FROM || 'noreply@kakeibo.enginsarak.com';
const FROM_NAME = 'Kakeibo';
const LANGS = ['de', 'en', 'es', 'fr', 'it'];

const BETREFF = {
  de: 'Bestätige deine E-Mail-Adresse',
  en: 'Confirm your email address',
  es: 'Confirma tu dirección de correo',
  fr: 'Confirme ton adresse e-mail',
  it: 'Conferma il tuo indirizzo e-mail',
};

const serviceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
  const parsed = JSON.parse(raw);
  parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  return parsed;
};

const accessToken = async () => {
  const sa = serviceAccount();
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/identitytoolkit',
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  })}`;
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(input), crypto.createPrivateKey(sa.private_key))
    .toString('base64url');

  const response = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${input}.${signature}`,
    }),
  });

  const data = await response.json();
  if (!data.access_token) throw new Error('token request failed');
  return data.access_token;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const header = req.headers?.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(Array.isArray(header) ? header[0] : header);
  if (!match) return res.status(401).json({ error: 'Missing bearer token' });

  let claims;
  try {
    claims = await verifyIdToken(match[1].trim());
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const email = String(claims.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Token carries no email' });
  if (claims.email_verified) return res.status(200).json({ ok: true, alreadyVerified: true });

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }
  const lang = LANGS.includes(payload?.lang) ? payload.lang : 'de';

  try {
    const token = await accessToken();

    const oob = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:sendOobCode`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'VERIFY_EMAIL', email, returnOobLink: true }),
      },
    );
    if (!oob.ok) return res.status(502).json({ error: 'Link could not be created' });

    const { oobLink, oobCode } = await oob.json();
    const code = oobCode || (oobLink ? new URL(oobLink).searchParams.get('oobCode') : null);
    if (!code) return res.status(502).json({ error: 'Link could not be created' });

    const link = `${APP_URL}/auth/action?mode=verifyEmail&oobCode=${encodeURIComponent(code)}&lang=${lang}`;
    const name = claims.name || email.split('@')[0];
    const html = templates.verify[lang].replaceAll('%LINK%', link).replaceAll('%DISPLAY_NAME%', name);

    const versand = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM },
        to: [{ email }],
        subject: BETREFF[lang],
        htmlContent: html,
      }),
    });

    if (!versand.ok) return res.status(502).json({ error: 'Mail could not be sent' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
