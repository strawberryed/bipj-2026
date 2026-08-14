import type { FirebaseOptions } from 'firebase/app';

export const environment = {
  production: true,
  geminiApiKey: '',
  stripePublishableKey: '',
  firebaseConfig: null as FirebaseOptions | null
};
