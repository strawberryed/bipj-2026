import type { FirebaseOptions } from 'firebase/app';

export const environment = {
  production: true,
  geminiApiKey: '',
  stripePublishableKey: '',
  firebaseConfig: {
    apiKey: 'AIzaSyBBYaEfIG5lp1lSS2lU8Ke_cDMImhCHlbE', authDomain: 'bipj2026.firebaseapp.com', projectId: 'bipj2026',
    storageBucket: 'bipj2026.firebasestorage.app', messagingSenderId: '28809855596', appId: '1:28809855596:web:17db696ef67b4a9ff68e49'
  } satisfies FirebaseOptions
};
