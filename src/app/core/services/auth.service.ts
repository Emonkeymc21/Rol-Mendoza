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
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = new BehaviorSubject<User | null | undefined>(undefined);
  private readonly auth: Auth | null;
  readonly user$: Observable<User | null> = this.state.pipe(
    filter((user): user is User | null => user !== undefined)
  );

  constructor(private firebase: FirebaseService, private router: Router) {
    this.auth = firebase.auth;
    if (!this.auth) {
      this.state.next(null);
      return;
    }
    onAuthStateChanged(this.auth, user => this.state.next(user));
  }

  get enabled(): boolean {
    return this.firebase.enabled;
  }

  get currentUser(): User | null {
    return this.state.value ?? null;
  }

  async registerWithEmail(displayName: string, email: string, password: string): Promise<User> {
    const auth = this.requireAuth();
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: displayName.trim() });
    await credential.user.reload();
    if (!credential.user.emailVerified) await sendEmailVerification(credential.user);
    this.state.next(credential.user);
    return credential.user;
  }

  async signInWithEmail(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.requireAuth(), email.trim(), password);
    return credential.user;
  }

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(this.requireAuth(), provider);
    return credential.user;
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
    await this.router.navigateByUrl('/');
  }

  friendlyError(error: unknown): string {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    const messages: Record<string, string> = {
      'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Probá iniciar sesión.',
      'auth/invalid-email': 'Revisá el correo electrónico.',
      'auth/invalid-credential': 'El correo o la contraseña no coinciden.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/popup-closed-by-user': 'Se cerró la ventana de Google antes de completar el acceso.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de Google. Habilitá ventanas emergentes e intentá otra vez.',
      'auth/network-request-failed': 'No pudimos conectarnos. Revisá tu conexión e intentá otra vez.',
      'auth/too-many-requests': 'Hubo demasiados intentos. Esperá unos minutos antes de volver a probar.'
    };
    return messages[code] || (error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
  }

  private requireAuth(): Auth {
    if (!this.auth) throw new Error('El acceso no está disponible en este momento.');
    return this.auth;
  }
}
