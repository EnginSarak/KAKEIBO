import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const isInvisible = (code) => code === 0xfeff || (code >= 0x200b && code <= 0x200d);

const clean = (value) => {
  if (typeof value !== 'string') return value;
  const stripped = Array.from(value)
    .filter((char) => !isInvisible(char.codePointAt(0)))
    .join('')
    .trim();
  return stripped.replace(/^(['"])(.*)\1$/, '$2').trim() || undefined;
};

const rawConfig = {
  apiKey: clean(process.env.REACT_APP_FIREBASE_API_KEY),
  authDomain: clean(process.env.REACT_APP_FIREBASE_AUTH_DOMAIN),
  projectId: clean(process.env.REACT_APP_FIREBASE_PROJECT_ID),
  storageBucket: clean(process.env.REACT_APP_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(process.env.REACT_APP_FIREBASE_APP_ID),
  measurementId: clean(process.env.REACT_APP_FIREBASE_MEASUREMENT_ID),
};

const isPlaceholder = (value) => !value || /your[_-]|xxxxx|G-XXXX/i.test(value);

const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1', '[::1]', ''].includes(window.location.hostname);

const useEmulator = process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true' && isLocalHost;

const hasRealConfig = ['apiKey', 'authDomain', 'projectId', 'appId'].every(
  (key) => !isPlaceholder(rawConfig[key]),
);

export const isFirebaseConfigured = hasRealConfig || useEmulator;

const firebaseConfig = hasRealConfig
  ? rawConfig
  : { apiKey: 'demo-key', authDomain: 'localhost', projectId: 'demo-kakeibo', appId: 'demo-app' };

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  if (useEmulator) {
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
    } catch (e) {
      console.warn('Firebase emulator connection failed:', e);
    }
  }
}

export const authTarget = useEmulator
  ? 'Emulator 127.0.0.1:9099'
  : hasRealConfig
    ? `Firebase: ${rawConfig.projectId}`
    : 'nicht konfiguriert';

export { auth, db };
export default app;
