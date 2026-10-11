/**
 * Who the visitor is to Arc, so their conversations and memory stay theirs.
 *
 * With Firebase configured (NEXT_PUBLIC_FIREBASE_*), the visitor is signed in anonymously and every request carries
 * a Firebase ID token that Arc's server verifies. Without it (local development), a random id kept in
 * localStorage identifies the visitor. Firebase is only loaded when it's configured.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const useFirebase = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const newId = () => crypto.randomUUID().replace(/-/g, "");

function stored(storage: Storage | undefined, key: string): string {
  try {
    const existing = storage?.getItem(key);
    if (existing) return existing;
    const id = newId();
    storage?.setItem(key, id);
    return id;
  } catch {
    return newId(); // private mode or blocked storage: a fresh id for this page view
  }
}

let tokenSource: Promise<() => Promise<string>> | null = null;

async function firebaseToken(): Promise<string> {
  tokenSource ??= (async () => {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getAuth, signInAnonymously } = await import("firebase/auth");
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    return () => user.getIdToken();
  })();
  return (await tokenSource)();
}

/** Headers that identify the visitor to /api/arc. */
export async function identityHeaders(): Promise<Record<string, string>> {
  // always sent: the server uses it when its memory runs without Firebase
  const headers: Record<string, string> = {
    "x-arc-visitor": stored(typeof window === "undefined" ? undefined : window.localStorage, "arc:visitor"),
  };
  if (useFirebase) {
    try {
      headers.authorization = `Bearer ${await firebaseToken()}`;
    } catch {
      tokenSource = null; // retry sign-in next time
    }
  }
  return headers;
}

/** The current conversation, kept for this browser tab so a reload continues it. */
export function conversationId(): string {
  return stored(typeof window === "undefined" ? undefined : window.sessionStorage, "arc:conversation");
}

export function startNewConversation(): string {
  try {
    window.sessionStorage.removeItem("arc:conversation");
  } catch {}
  return conversationId();
}
