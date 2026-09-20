import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { BehaviorSubject, distinctUntilChanged, filter, firstValueFrom, map, Observable, take } from 'rxjs';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = new BehaviorSubject<User | null | undefined>(undefined);
  private readonly auth: Auth | null;
  private readonly provisioning = new Map<string, Promise<void>>();
  readonly user$: Observable<User | null> = this.state.pipe(
    filter((user): user is User | null => user !== undefined)
  );
  readonly loading$: Observable<boolean> = this.state.pipe(
    map(user => user === undefined),
    distinctUntilChanged()
  );

  constructor(private firebase: FirebaseService, private router: Router) {
    this.auth = firebase.auth;
    if (!this.auth) {
      this.state.next(null);
      return;
    }
    onAuthStateChanged(
      this.auth,
      user => {
        this.state.next(user);
        if (user) {
          void this.ensureInitialUserDocument(user).catch(error => {
            console.error('No se pudo preparar el perfil inicial del usuario.', error);
          });
        }
      },
      error => {
        console.error('Firebase no pudo restaurar el estado de autenticación.', error);
        this.state.next(null);
      }
    );
  }

  get enabled(): boolean {
    return this.firebase.enabled;
  }

  get currentUser(): User | null {
    return this.auth?.currentUser || this.state.value || null;
  }

  async waitUntilReady(): Promise<User | null> {
    return firstValueFrom(this.user$.pipe(take(1)));
  }

  async registerWithEmail(displayName: string, email: string, password: string): Promise<User> {
    const auth = this.requireAuth();
    await this.firebase.persistenceReady;
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    try {
      await updateProfile(credential.user, { displayName: displayName.trim() });
      await credential.user.reload();
    } catch (error) {
      console.error('La cuenta se creó, pero no se pudo actualizar el nombre en Firebase Auth.', error);
    }
    if (!credential.user.emailVerified) {
      try {
        await sendEmailVerification(credential.user);
      } catch (error) {
        // La verificación es informativa por ahora y no forma parte de los guards.
        console.error('No se pudo enviar el correo de verificación.', error);
      }
    }
    return this.finishAuthentication(credential.user);
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    await this.firebase.persistenceReady;
    const credential = await signInWithEmailAndPassword(this.requireAuth(), email.trim(), password);
    return this.finishAuthentication(credential.user);
  }

  async signInWithGoogle(): Promise<User> {
    await this.firebase.persistenceReady;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(this.requireAuth(), provider);
    return this.finishAuthentication(credential.user);
  }

  async updateDisplayName(displayName: string): Promise<void> {
    const user = this.currentUser;
    if (!user) throw new Error('Necesitás iniciar sesión para continuar.');
    await updateProfile(user, { displayName: displayName.trim() });
    await user.reload();
    this.state.next(user);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.requireAuth(), email.trim());
  }

  async getIdToken(): Promise<string> {
    const user = this.currentUser;
    if (!user) throw new Error('Necesitás iniciar sesión para continuar.');
    return user.getIdToken();
  }

  async logout(): Promise<void> {
    await signOut(this.requireAuth());
    this.state.next(null);
    await this.router.navigateByUrl('/ingresar');
  }

  friendlyError(error: unknown): string {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Probá iniciar sesión.',
      'auth/invalid-email': 'Revisá el correo electrónico.',
      'auth/invalid-credential': 'El correo o la contraseña no coinciden.',
      'auth/invalid-login-credentials': 'El correo o la contraseña no coinciden.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de completar el acceso.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Habilitá ventanas emergentes e intentá otra vez.',
      'auth/unauthorized-domain': 'Este dominio todavía no está autorizado en Firebase Authentication.',
      'auth/operation-not-allowed': 'Este método de acceso no está habilitado en Firebase Authentication.',
      'auth/account-exists-with-different-credential': 'Ese correo ya utiliza otro método de acceso.',
      'auth/user-disabled': 'Esta cuenta fue deshabilitada. Contactá al equipo de Rol Mendoza.',
      'auth/network-request-failed': 'No pudimos conectarnos. Revisá tu conexión e intentá otra vez.',
      'auth/too-many-requests': 'Hubo demasiados intentos. Esperá unos minutos antes de volver a probar.'
    };
    return messages[code] || 'No pudimos completar la operación. Intentá nuevamente.';
  }

  private requireAuth(): Auth {
    if (!this.auth) throw new Error('El acceso no está disponible en este momento.');
    return this.auth;
  }

  private async finishAuthentication(user: User): Promise<User> {
    // signInWithPopup/signInWithEmail ya confirmó la identidad. Actualizamos el
    // estado inmediatamente para no esperar otro tick de onAuthStateChanged.
    this.state.next(user);
    try {
      await this.ensureInitialUserDocument(user);
    } catch (error) {
      // Un problema al crear el borrador no invalida una sesión ya autenticada.
      // El onboarding podrá crear el perfil completo y mostrar el error si Firestore falla.
      console.error('La sesión se inició, pero no se pudo crear el perfil inicial.', error);
    }
    return user;
  }

  private ensureInitialUserDocument(user: User): Promise<void> {
    const existing = this.provisioning.get(user.uid);
    if (existing) return existing;

    const task = this.createInitialUserDocument(user).finally(() => {
      this.provisioning.delete(user.uid);
    });
    this.provisioning.set(user.uid, task);
    return task;
  }

  private async createInitialUserDocument(user: User): Promise<void> {
    if (!this.firebase.app) return;
    const api = await import('firebase/firestore');
    const database = api.getFirestore(this.firebase.app);
    const reference = api.doc(database, 'users', user.uid);
    const snapshot = await api.getDoc(reference);
    if (snapshot.exists()) return;

    const nameParts = (user.displayName || '').trim().split(/\s+/).filter(Boolean);
    await api.setDoc(reference, {
      uid: user.uid,
      displayName: user.displayName || 'Aventurero/a',
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
      role: 'PLAYER',
      province: 'Mendoza',
      city: '',
      photoURL: user.photoURL || '',
      active: true,
      profileCompleted: false,
      preferences: {
        systems: [],
        experience: '',
        mode: 'Mixto',
        frequency: '',
        availability: '',
        atmosphere: '',
        bio: ''
      },
      createdAt: api.serverTimestamp(),
      updatedAt: api.serverTimestamp()
    });
  }
}
