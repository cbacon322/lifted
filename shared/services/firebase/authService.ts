import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb } from './firebaseConfig';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
}

// Sign up with email and password
export async function signUp(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Create user profile in Firestore
  const db = getFirestoreDb();
  await setDoc(doc(db, 'users', credential.user.uid, 'profile', 'main'), {
    email,
    createdAt: new Date(),
  });

  return credential.user;
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

// Sign out
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

// Get current user
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

// Subscribe to auth state changes
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

// Get user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirestoreDb();
  const profileRef = doc(db, 'users', uid, 'profile', 'main');
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    uid,
    email: data.email,
    displayName: data.displayName,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

// For development: anonymous user ID (no auth required)
const ANONYMOUS_USER_ID = 'anonymous_dev_user';

export function getDevUserId(): string {
  return ANONYMOUS_USER_ID;
}

// Get user ID (auth user or dev fallback)
export function getUserId(): string {
  const user = getCurrentUser();
  return user?.uid || ANONYMOUS_USER_ID;
}
