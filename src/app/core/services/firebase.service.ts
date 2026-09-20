import { Injectable } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly enabled: boolean;
  readonly app: FirebaseApp | null;
  readonly auth: Auth | null;
  readonly persistenceReady: Promise<void>;

  constructor() {
    const config = environment.firebase;
    this.enabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
    if (!this.enabled) {
      this.app = null;
      this.auth = null;
      this.persistenceReady = Promise.resolve();
      return;
    }
    this.app = getApps().length ? getApps()[0] : initializeApp(config);
    this.auth = getAuth(this.app);
    this.persistenceReady = setPersistence(this.auth, browserLocalPersistence).catch(error => {
      // El acceso sigue funcionando con la persistencia disponible en el navegador.
      // Dejamos el detalle en consola para diagnóstico sin bloquear el inicio de sesión.
      console.error('No se pudo configurar la persistencia local de Firebase Auth.', error);
    });
  }
}
