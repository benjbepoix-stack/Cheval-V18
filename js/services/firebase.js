/*
 * Firebase : authentification (e-mail / mot de passe) + Realtime Database.
 *
 * - SDK chargé dynamiquement : si Firebase est injoignable, l'app propose de
 *   continuer hors ligne avec les données de l'appareil.
 * - Session conservée sur l'appareil (même stockage que l'ancienne version :
 *   aucune reconnexion nécessaire après la mise à jour).
 * - Données : users/<uid>/app — écritures clé par clé (`update`).
 */
import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION } from '../config/firebase-config.js';

const SDK = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
const LOAD_TIMEOUT = 12000;
const WRITE_DELAY = 250;

let appMod, authMod, dbMod, auth, db;
let user = null;
let rootRef = null;
let ready = false;
let connected = null;
let fatal = null;
let inflight = 0;
let buffer = {};
let flushTimer = null;
let unsubscribeData = null;
let handlers = { onUser: () => {}, onRemote: () => {}, onStatus: () => {}, onError: () => {}, onAck: () => {}, onReady: () => {}, getSnapshot: () => ({}) };

const withTimeout = (p, ms, msg) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(msg)), ms))]);
const clean = v => JSON.parse(JSON.stringify(v));

function emitStatus() {
  let status;
  if (fatal) status = 'local';
  else if (connected === false) status = 'offline';
  else if (!ready) status = 'connecting';
  else if (inflight > 0 || Object.keys(buffer).length) status = 'syncing';
  else status = 'online';
  handlers.onStatus(status, fatal);
}

export function describeAuthError(error) {
  const map = {
    'auth/invalid-email': 'Adresse e-mail invalide.',
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cette adresse e-mail.',
    'auth/missing-password': 'Indiquez votre mot de passe.',
    'auth/email-already-in-use': 'Cette adresse possède déjà un compte : utilisez « Se connecter ».',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
    'auth/operation-not-allowed': 'La connexion e-mail / mot de passe n’est pas activée dans Firebase (Authentication → Sign-in method).',
    'auth/network-request-failed': 'Connexion Internet indisponible.',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.'
  };
  return map[error?.code] || 'Une erreur est survenue. Réessayez.';
}

function describeDbError(error) {
  const code = String(error?.code || error?.message || '');
  if (/permission/i.test(code)) return 'Accès refusé par les règles Firebase.';
  return 'Synchronisation indisponible.';
}

/* ---------- Écritures ---------- */
function flush() {
  clearTimeout(flushTimer);
  flushTimer = null;
  if (!ready || fatal || !rootRef || !Object.keys(buffer).length) return emitStatus();
  const payload = clean(buffer);
  buffer = {};
  inflight++;
  emitStatus();
  dbMod
    .update(rootRef, payload)
    .then(() => handlers.onAck(Object.keys(payload)))
    .catch(error => {
      console.error('[firebase] écriture refusée', error);
      handlers.onError(describeDbError(error));
    })
    .finally(() => {
      inflight--;
      emitStatus();
    });
}

export function pushCloud(payload) {
  Object.assign(buffer, payload);
  if (fatal) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, WRITE_DELAY);
  emitStatus();
}

export const flushNow = () => flushTimer && flush();

/** Abandonne les écritures en attente (changement de compte). */
export function clearPending() {
  clearTimeout(flushTimer);
  flushTimer = null;
  buffer = {};
}

/* ---------- Données de l'utilisateur ---------- */
function listen(u) {
  unsubscribeData?.();
  ready = false;
  rootRef = dbMod.ref(db, `users/${u.uid}/app`);
  let first = true;
  unsubscribeData = dbMod.onValue(
    rootRef,
    snap => {
      const value = snap.val();
      if (first) {
        first = false;
        const hasData = value && typeof value === 'object' && Object.keys(value).length > 0;
        if (hasData) handlers.onRemote(value);
        else Object.assign(buffer, handlers.getSnapshot(), buffer); // compte vide : on envoie l'appareil
        ready = true;
        flush();
        handlers.onReady();
        return;
      }
      handlers.onRemote(value || {});
    },
    error => {
      console.error('[firebase] lecture refusée', error);
      fatal = describeDbError(error);
      emitStatus();
      handlers.onError(fatal);
      handlers.onReady();
    }
  );
}

/* ---------- Initialisation ---------- */
export async function initFirebase(options) {
  handlers = { ...handlers, ...options };
  emitStatus();
  try {
    [appMod, authMod, dbMod] = await withTimeout(
      Promise.all([import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-database.js`)]),
      LOAD_TIMEOUT,
      'timeout'
    );
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    auth = authMod.getAuth(app);
    db = dbMod.getDatabase(app);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence).catch(() => {});
    dbMod.onValue(dbMod.ref(db, '.info/connected'), snap => {
      connected = snap.val() === true;
      emitStatus();
    });
    authMod.onAuthStateChanged(auth, u => {
      user = u;
      // onUser d'abord : l'app peut purger les données d'un autre compte avant la synchro.
      handlers.onUser(u);
      if (u) listen(u);
      else {
        unsubscribeData?.();
        unsubscribeData = null;
        ready = false;
        rootRef = null;
      }
      emitStatus();
    });
    return true;
  } catch (error) {
    console.warn('[firebase] indisponible', error);
    fatal = 'Firebase est injoignable (connexion ?).';
    emitStatus();
    return false;
  }
}

export const currentUser = () => user;

export async function signIn(email, password) {
  return authMod.signInWithEmailAndPassword(auth, email, password);
}
export async function signUp(email, password) {
  return authMod.createUserWithEmailAndPassword(auth, email, password);
}
export async function resetPassword(email) {
  return authMod.sendPasswordResetEmail(auth, email);
}
export async function signOutUser() {
  flushNow();
  return authMod.signOut(auth);
}
