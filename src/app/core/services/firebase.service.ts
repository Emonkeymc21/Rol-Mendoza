import { Injectable } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  readonly enabled: boolean;
  readonly app: FirebaseApp | null;
  readonly auth: Auth | null;

  constructor() {
    const config = environment.firebase;
    this.enabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
    if (!this.enabled) {
      this.app = null;
      this.auth = null;
      return;
    }
    this.app = getApps().length ? getApps()[0] : initializeApp(config);
    this.auth = getAuth(this.app);
    void setPersistence(this.auth, browserLocalPersistence);
  }
}
