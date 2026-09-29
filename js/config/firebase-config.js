/*
 * Configuration Firebase (application Web) du projet mon-espace-equin.
 * Ces valeurs ne sont pas des secrets : elles sont publiques par conception.
 * Les données sont protégées par l'authentification et les règles de
 * database.rules.json (chaque compte ne voit que ses propres données).
 */
export const FIREBASE_SDK_VERSION = '12.19.0';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCF-XeHQFegTjNWrHpSM0pYQsWwYbN0Mlk',
  authDomain: 'mon-espace-equin.firebaseapp.com',
  databaseURL: 'https://mon-espace-equin-default-rtdb.firebaseio.com/',
  projectId: 'mon-espace-equin',
  storageBucket: 'mon-espace-equin.firebasestorage.app',
  messagingSenderId: '804648476556',
  appId: '1:804648476556:web:7b7dbe135e359ee404c0a9'
};
