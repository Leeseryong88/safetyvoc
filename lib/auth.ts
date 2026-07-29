import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import type { UserProfile } from "./types";

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return credential.user;
}

export async function logOut() {
  await signOut(getFirebaseAuth());
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user?.email) {
    throw new Error("로그인이 필요합니다.");
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export function subscribeAuth(onUser: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), onUser);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), "users", uid));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    uid,
    email: String(data.email ?? ""),
    displayName: String(data.displayName ?? ""),
    storeName: String(data.storeName ?? ""),
  };
}
