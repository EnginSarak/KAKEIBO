import crypto from 'node:crypto';
import { templates } from '../_lib/mail-templates.mjs';
import { profileLanguage } from '../_lib/profile.mjs';

const PROJECT = 'kakeibo-application1';
const APP_URL = process.env.BANK_APP_URL || 'https://kakeibo.enginsarak.com';
const FROM = process.env.MAIL_FROM || 'noreply@kakeibo.enginsarak.com';
const FROM_NAME = 'Kakeibo';
const LANGS = ['de', 'en', 'es', 'fr', 'it'];

const BETREFF = {
  de: 'Passwort zurücksetzen',
  en: 'Reset your password',
  es: 'Restablecer la contraseña',
  fr: 'Réinitialiser le mot de passe',
  it: 'Reimposta la password',
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
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore',
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

const debugAllowed = (req) => {
  const secret = process.env.DEBUG_TOKEN;
  const given = req.headers?.['x-debug-token'];
  return Boolean(secret && given && given === secret);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let payload = req.body;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }

  const email = String(payload?.email || '').trim().toLowerCase();
  const lang = LANGS.includes(payload?.lang) ? payload.lang : 'de';

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const done = () => res.status(200).json({ ok: true });
  const schritte = [];

  try {
    const token = await accessToken();
    schritte.push('token');

    const oob = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:sendOobCode`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email, returnOobLink: true }),
      },
    );

    schritte.push(`oob:${oob.status}`);
    if (!oob.ok) {
      if (debugAllowed(req)) return res.status(200).json({ schritte, fehler: await oob.text() });
      return done();
    }

    const { oobLink, oobCode } = await oob.json();
    const code = oobCode || (oobLink ? new URL(oobLink).searchParams.get('oobCode') : null);
    if (!code) return done();

    let name = email.split('@')[0];
    let sprache = lang;
    try {
      const lookup = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: [email] }),
        },
      );
      if (lookup.ok) {
        const treffer = (await lookup.json()).users?.[0];
        if (treffer?.displayName) name = treffer.displayName;
        sprache = await profileLanguage(token, treffer?.localId, lang);
      }
    } catch (error) {
      void error;
    }
    const link = `${APP_URL}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(code)}&lang=${sprache}`;

    const vorlage = templates.reset[sprache];
    if (!vorlage) {
      if (debugAllowed(req)) return res.status(200).json({ schritte, fehler: 'Vorlage fehlt' });
      return done();
    }
    schritte.push('vorlage');
    const html = vorlage.replaceAll('%LINK%', link).replaceAll('%DISPLAY_NAME%', name);

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
        subject: BETREFF[sprache],
        htmlContent: html,
      }),
    });

    schritte.push(`brevo:${versand.status}`);
    if (debugAllowed(req)) return res.status(200).json({ schritte, brevo: await versand.text() });
    return done();
  } catch (error) {
    if (debugAllowed(req)) return res.status(200).json({ schritte, fehler: String(error?.message || error) });
    return done();
  }
}
