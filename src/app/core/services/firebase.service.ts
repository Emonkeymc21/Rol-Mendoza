import { Injectable } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly enabled: boolean;
  readonly app: FirebaseApp | null;
  readonly auth: Auth | null;
  readonly persistenceReady: Promise<void>;
  private firestoreReady?: Promise<{ api: typeof import('./firestore-api'); database: import('firebase/firestore').Firestore }>;
  private readonly emulators = (environment as typeof environment & {
    emulators?: {host: string; authPort: number; firestorePort: number}
  }).emulators;

  constructor() {
    const config = environment.firebase;
    if (this.emulators && (environment.production || config.projectId !== 'demo-cumbre20' ||
      this.emulators.host !== '127.0.0.1' || !['127.0.0.1', 'localhost'].includes(window.location.hostname))) {
      throw new Error('La configuración de emuladores requiere el proyecto demo y una URL local.');
    }
    this.enabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
    if (!this.enabled) {
      this.app = null;
      this.auth = null;
      this.persistenceReady = Promise.resolve();
      return;
    }
    this.app = getApps().length ? getApps()[0] : initializeApp(config);
    if (this.emulators && this.app.options.projectId !== 'demo-cumbre20') {
      throw new Error('El entorno de pruebas no puede reutilizar una aplicación Firebase real.');
    }
    this.auth = getAuth(this.app);
    if (this.emulators) {
      connectAuthEmulator(this.auth, `http://${this.emulators.host}:${this.emulators.authPort}`);
      document.documentElement.dataset['emulatorProject'] = this.app.options.projectId;
    }
    this.persistenceReady = setPersistence(this.auth, browserLocalPersistence).catch(error => {
      // El acceso sigue funcionando con la persistencia disponible en el navegador.
      // Dejamos el detalle en consola para diagnóstico sin bloquear el inicio de sesión.
      console.error('No se pudo configurar la persistencia local de Firebase Auth.', error);
    });
  }

  loadFirestore() {
    const app = this.app;
    if (!app) throw new Error('Firestore no está disponible en este momento.');
    return this.firestoreReady ??= import('./firestore-api').then(api => {
      const database = api.getFirestore(app);
      if (this.emulators) api.connectFirestoreEmulator(database, this.emulators.host, this.emulators.firestorePort);
      api.bindFirestorePageLifecycle(database);
      return { api, database };
    });
  }
}
