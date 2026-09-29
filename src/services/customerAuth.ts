import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import type { User } from 'firebase/auth';

const app = initializeApp({
  projectId: 'soow-2dc12',
  appId: '1:600450156090:web:1e845b254d9947797c9703',
  apiKey: 'AIzaSyCCjveYsN7akd6NkK5upM8G98gcoK1Wogo',
  authDomain: 'soow-2dc12.firebaseapp.com',
});
export const customerAuth = getAuth(app);
export { onAuthStateChanged, signOut };
export type { User };

export async function emailSignIn(email: string, password: string, name?: string) {
  if (name) {
    const result = await createUserWithEmailAndPassword(customerAuth, email, password);
    await updateProfile(result.user, { displayName: name });
    await result.user.getIdToken(true);
    return result.user;
  }
  return (await signInWithEmailAndPassword(customerAuth, email, password)).user;
}

export async function socialSignIn(provider: 'google' | 'apple') {
  const instance = provider === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
  return (await signInWithPopup(customerAuth, instance)).user;
}

const apiBase = import.meta.env.PROD && import.meta.env.MODE !== 'mobile' ? '/api' : 'https://soow-2dc12.web.app/api';
export type CustomerProfile = { uid: string; name: string; email: string; interests: string[]; onboarded: boolean };
export async function customerRequest<T>(path: string, user: User, method = 'GET', body?: unknown): Promise<T> {
  const token = await user.getIdToken();
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || 'تعذر الاتصال بحسابك. حاول مجددًا.');
  return result.data as T;
}
