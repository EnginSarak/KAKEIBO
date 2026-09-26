import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  deleteUser,
  applyActionCode,
  checkActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

function getVerificationSettings() {
  if (typeof window === 'undefined') return undefined;
  return { url: `${window.location.origin}/app`, handleCodeInApp: false };
}

export function defaultDisplayName(email, provided) {
  const trimmed = (provided || '').trim();
  if (trimmed) return trimmed;
  return (email || '').split('@')[0] || '';
}

export async function signUp(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const name = defaultDisplayName(email, displayName);

  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, 'users', user.uid), {
    displayName: name,
    email,
    language: 'de',
    currency: 'EUR',
    theme: 'system',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await sendEmailVerification(user, getVerificationSettings());

  return user;
}

const googleProvider = () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
};

async function ensureUserDoc(user, lang) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    displayName: user.displayName || defaultDisplayName(user.email),
    email: user.email || '',
    language: lang,
    currency: 'EUR',
    theme: 'system',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

const remember = (key, value) => {
  try {
    window.sessionStorage.setItem(key, value);
  } catch (error) {
    void error;
  }
};

const recall = (key) => {
  try {
    const value = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
    return value;
  } catch (error) {
    return null;
  }
};

export async function signInWithGoogle(lang = 'de') {
  try {
    const result = await signInWithPopup(auth, googleProvider());
    await ensureUserDoc(result.user, lang);
    return result.user;
  } catch (error) {
    const weiterPerUmleitung = [
      'auth/popup-blocked',
      'auth/operation-not-supported-in-this-environment',
      'auth/web-storage-unsupported',
    ];
    if (weiterPerUmleitung.includes(error.code)) {
      remember('kakeibo_google_lang', lang);
      await signInWithRedirect(auth, googleProvider());
      return null;
    }
    throw error;
  }
}

export async function completeGoogleRedirect() {
  const result = await getRedirectResult(auth);
  if (!result || !result.user) return null;
  await ensureUserDoc(result.user, recall('kakeibo_google_lang') || 'de');
  return result.user;
}

export async function signIn(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error('No user logged in');
  await sendEmailVerification(auth.currentUser, getVerificationSettings());
}

export async function reloadUser() {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser;
}

export async function logOut() {
  await signOut(auth);
}

export async function resetPassword(email, lang = 'de') {
  try {
    const response = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, lang }),
    });
    if (response.ok) return;
  } catch (error) {
    void error;
  }
  await sendPasswordResetEmail(auth, email);
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user logged in');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function changeEmail(currentPassword, newEmail) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user logged in');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updateEmail(user, newEmail);
  await setDoc(doc(db, 'users', user.uid), { email: newEmail, updatedAt: serverTimestamp() }, { merge: true });
}

export async function changeDisplayName(newName) {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');
  await updateProfile(user, { displayName: newName });
  await setDoc(doc(db, 'users', user.uid), { displayName: newName, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteUserAccount(password) {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('No user logged in');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
}

export async function applyEmailActionCode(oobCode) {
  await applyActionCode(auth, oobCode);
  if (auth.currentUser) {
    try { await auth.currentUser.reload(); } catch {}
  }
}

export async function inspectActionCode(oobCode) {
  return await checkActionCode(auth, oobCode);
}

export async function verifyResetCode(oobCode) {
  return await verifyPasswordResetCode(auth, oobCode);
}

export async function confirmReset(oobCode, newPassword) {
  await confirmPasswordReset(auth, oobCode, newPassword);
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserSettings(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) return userDoc.data();
  return null;
}

export async function updateUserSettings(userId, settings) {
  await setDoc(doc(db, 'users', userId), { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}
