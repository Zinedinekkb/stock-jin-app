// lib/demo/authShim.js
// Stand-in for 'firebase/auth' in demo mode: always signed in as a fixed demo admin.

export const DEMO_USER = {
  uid: 'demo-admin',
  email: 'demo@example.com',
  displayName: 'ผู้ดูแลระบบ (เดโม)',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  providerData: [{ providerId: 'password' }],
  async getIdToken() { return 'demo-token'; },
  async getIdTokenResult() { return { token: 'demo-token', claims: {} }; },
  async reload() {},
  async delete() {},
  toJSON() { return { uid: this.uid, email: this.email }; },
};

const demoAuth = { currentUser: DEMO_USER, app: null, name: 'demo-auth', languageCode: 'th' };

export function getAuth() { return demoAuth; }
export function initializeAuth() { return demoAuth; }
export function connectAuthEmulator() {}

function subscribe(_auth, cb) {
  let active = true;
  const run = () => { if (active && typeof cb === 'function') cb(DEMO_USER); else if (active && cb && cb.next) cb.next(DEMO_USER); };
  // asynchronous like the real SDK, but immediately after subscription
  Promise.resolve().then(run);
  return () => { active = false; };
}
export const onAuthStateChanged = subscribe;
export const onIdTokenChanged = subscribe;

const ok = async () => ({ user: DEMO_USER, providerId: null, operationType: 'signIn' });
export const signInWithEmailAndPassword = ok;
export const createUserWithEmailAndPassword = ok;
export const signInWithPopup = ok;
export const signInWithRedirect = async () => {};
export const getRedirectResult = async () => null;
export const signInAnonymously = ok;
export const signInWithCustomToken = ok;

export async function signOut() {
  // Demo has no signed-out state: reloading restarts the demo with fresh data.
  if (typeof window !== 'undefined') window.location.reload();
}

export const updateProfile = async () => {};
export const updateEmail = async () => {};
export const updatePassword = async () => {};
export const sendPasswordResetEmail = async () => {};
export const sendEmailVerification = async () => {};
export const reauthenticateWithCredential = ok;
export const reauthenticateWithPopup = ok;
export const linkWithPopup = ok;
export const deleteUser = async () => {};
export const setPersistence = async () => {};
export const browserLocalPersistence = { type: 'LOCAL' };
export const browserSessionPersistence = { type: 'SESSION' };
export const inMemoryPersistence = { type: 'NONE' };

class DemoProvider {
  constructor(providerId) { this.providerId = providerId; }
  addScope() { return this; }
  setCustomParameters() { return this; }
}
export class GoogleAuthProvider extends DemoProvider {
  constructor() { super('google.com'); }
  static credential() { return {}; }
}
export class GithubAuthProvider extends DemoProvider {
  constructor() { super('github.com'); }
  static credential() { return {}; }
}
export class FacebookAuthProvider extends DemoProvider {
  constructor() { super('facebook.com'); }
}
export class OAuthProvider extends DemoProvider {}
export class EmailAuthProvider {
  static credential() { return {}; }
}
