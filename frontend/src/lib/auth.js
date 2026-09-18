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

export async function resetPassword(email) {
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
