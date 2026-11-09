import { Injectable } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';

const emulatedDatabases = new WeakSet<import('firebase/firestore').Firestore>();

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly enabled: boolean;
  readonly app: FirebaseApp | null;
  private authReady?: Promise<{api: typeof import('./auth-api'); auth: import('firebase/auth').Auth}>;
  get persistenceReady(): Promise<void> { return this.loadAuth().then(() => undefined); }
  private firestoreReady?: Promise<{ api: typeof import('./firestore-api'); database: import('firebase/firestore').Firestore }>;
  private readonly emulators = (environment as typeof environment & {
    emulators?: {host: string; authPort: number; firestorePort: number}
  }).emulators;

  constructor() {
    const config = environment.firebase;
    if (this.emulators && (environment.production || config.projectId !== 'demo-cumbre20' ||
      this.emulators.host !== '127.0.0.1' || (typeof window !== 'undefined' && !['127.0.0.1', 'localhost'].includes(window.location.hostname)))) {
      throw new Error('La configuración de emuladores requiere el proyecto demo y una URL local.');
    }
    this.enabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
    if (!this.enabled) {
      this.app = null;
      return;
    }
    if (this.emulators && typeof document !== 'undefined') document.documentElement.setAttribute('data-emulator-project', config.projectId);
    this.app = getApps().length ? getApps()[0] : initializeApp(config);
    if (this.emulators && this.app.options.projectId !== 'demo-cumbre20') {
      throw new Error('El entorno de pruebas no puede reutilizar una aplicación Firebase real.');
    }
  }

  loadAuth() {
    const app = this.app;
    if (!app || typeof window === 'undefined') return Promise.reject(new Error('Auth requiere un navegador.'));
    return this.authReady ??= import('./auth-api').then(async api => {
      // Same persistence options as getAuth, without eager OAuth iframe/GAPI work.
      // The popup resolver is supplied explicitly when the user chooses Google.
      const auth = api.initializeAuth(app, {persistence: [api.indexedDBLocalPersistence, api.browserLocalPersistence, api.browserSessionPersistence]});
      if (this.emulators) {
        api.connectAuthEmulator(auth, `http://${this.emulators.host}:${this.emulators.authPort}`);
        document.documentElement.dataset['emulatorProject'] = app.options.projectId;
      }
      await api.setPersistence(auth, api.browserLocalPersistence).catch(error => {
        console.error('No se pudo configurar la persistencia local de Firebase Auth.', error);
      });
      return {api, auth};
    });
  }

  loadFirestore() {
    const app = this.app;
    if (!app) throw new Error('Firestore no está disponible en este momento.');
    return this.firestoreReady ??= import('./firestore-api').then(api => {
      const database = api.getFirestore(app);
      if (this.emulators && !emulatedDatabases.has(database)) {
        api.connectFirestoreEmulator(database, this.emulators.host, this.emulators.firestorePort);
        emulatedDatabases.add(database);
      }
      return { api, database };
    });
  }
}
