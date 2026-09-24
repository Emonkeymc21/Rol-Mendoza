import { Injectable } from '@angular/core';
import type { DocumentData } from 'firebase/firestore';
import { BehaviorSubject, filter, Observable, shareReplay, tap } from 'rxjs';
import { isAvatarClass, migrateLegacyAvatar } from '../data/avatar-classes';
import { BlockedUser, ProfileInput, UserPrivateProfile, UserProfile } from '../models/user-profile.model';
import { AuthService } from './auth.service';
import { ContactNormalizerService } from './contact-normalizer.service';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly ownProfileState = new BehaviorSubject<UserProfile | null | undefined>(undefined);
  private readonly publicProfileCache = new Map<string, Promise<UserProfile | null>>();
  private readonly privateProfileCache = new Map<string, Promise<UserPrivateProfile | null>>();
  private ownProfileWatch$?: Observable<UserProfile | null>;
  private activeUid = '';
  readonly ownProfile$ = this.ownProfileState.pipe(
    filter((profile): profile is UserProfile | null => profile !== undefined)
  );

  constructor(
    private auth: AuthService,
    private firebase: FirebaseService,
    private contacts: ContactNormalizerService
  ) {
    this.auth.user$.subscribe(user => {
      const nextUid = user?.uid || '';
      if (nextUid !== this.activeUid) {
        this.activeUid = nextUid;
        this.ownProfileWatch$ = undefined;
      }
      if (!user) {
        this.publicProfileCache.clear();
        this.privateProfileCache.clear();
        this.ownProfileState.next(null);
      }
    });
  }

  async getOwnProfile(): Promise<UserProfile | null> {
    const user = this.requireUser();
    const cached = this.publicProfileCache.get(user.uid);
    if (cached) {
      const profile = await cached;
      this.ownProfileState.next(profile);
      return profile;
    }
    const request = this.fetchProfile(user.uid, true);
    this.publicProfileCache.set(user.uid, request);
    try {
      const profile = await request;
      this.ownProfileState.next(profile);
      return profile;
    } catch (error) {
      this.publicProfileCache.delete(user.uid);
      throw error;
    }
  }

  async getProfile(uid: string): Promise<UserProfile | null> {
    const cached = this.publicProfileCache.get(uid);
    if (cached) return cached;
    const request = this.fetchProfile(uid, false);
    this.publicProfileCache.set(uid, request);
    try {
      return await request;
    } catch (error) {
      this.publicProfileCache.delete(uid);
      throw error;
    }
  }

  private async fetchProfile(uid: string, migrateAvatar: boolean): Promise<UserProfile | null> {
    const { api, database } = await this.loadFirestore();
    const snapshot = await api.getDoc(api.doc(database, 'users', uid));
    const data = snapshot.exists() ? snapshot.data() : null;
    const profile = data ? this.mapPublic(data) : null;
    if (migrateAvatar && data && profile && !isAvatarClass(data['avatarClass'])) {
      try {
        await api.setDoc(api.doc(database, 'users', uid), {
          avatarClass: profile.avatarClass,
          updatedAt: api.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        // Un perfil legado incompleto puede no cumplir todavía todas las reglas
        // actuales. Conservamos el emblema determinístico en memoria y el
        // onboarding lo persistirá al guardar el documento completo.
        console.warn('El emblema legado se guardará al completar el perfil.', error);
      }
    }
    return profile;
  }

  async getOwnPrivateProfile(): Promise<UserPrivateProfile | null> {
    return this.getContact(this.requireUser().uid);
  }

  async getContact(uid: string): Promise<UserPrivateProfile | null> {
    const cached = this.privateProfileCache.get(uid);
    if (cached) return cached;
    const request = this.loadFirestore().then(({ api, database }) =>
      api.getDoc(api.doc(database, 'userPrivate', uid)).then(snapshot => snapshot.exists() ? this.mapPrivate(snapshot.data()) : null)
    );
    this.privateProfileCache.set(uid, request);
    try {
      return await request;
    } catch (error) {
      this.privateProfileCache.delete(uid);
      throw error;
    }
  }

  async isOwnProfileComplete(): Promise<boolean> {
    const [profile, privateProfile] = await Promise.all([
      this.getOwnProfile(),
      this.getOwnPrivateProfile()
    ]);
    return this.isComplete(profile)
      && privateProfile?.privacyConsent === true
      && Boolean(privateProfile.whatsappNumber || privateProfile.instagramUsername);
  }

  watchProfiles(): Observable<UserProfile[]> {
    return new Observable(subscriber => {
      let stopped = false;
      let unsubscribe: (() => void) | undefined;
      void this.loadFirestore().then(({ api, database }) => {
        if (stopped) return;
        const profilesQuery = api.query(
          api.collection(database, 'users'),
          api.where('active', '==', true),
          api.where('profileCompleted', '==', true)
        );
        unsubscribe = api.onSnapshot(profilesQuery, snapshot => {
          const profiles = snapshot.docs.map(item => this.mapPublic(item.data()));
          profiles.forEach(profile => this.publicProfileCache.set(profile.uid, Promise.resolve(profile)));
          subscriber.next(profiles);
        }, error => subscriber.error(error));
      }).catch(error => subscriber.error(error));
      return () => { stopped = true; unsubscribe?.(); };
    });
  }

  watchOwnProfile(): Observable<UserProfile | null> {
    if (this.ownProfileWatch$) return this.ownProfileWatch$;
    this.ownProfileWatch$ = new Observable<UserProfile | null>(subscriber => {
      let stopped = false;
      let unsubscribe: (() => void) | undefined;
      void this.loadFirestore().then(({ api, database }) => {
        if (stopped) return;
        const user = this.requireUser();
        unsubscribe = api.onSnapshot(api.doc(database, 'users', user.uid), snapshot => {
          const profile = snapshot.exists() ? this.mapPublic(snapshot.data()) : null;
          this.publicProfileCache.set(user.uid, Promise.resolve(profile));
          subscriber.next(profile);
        }, error => subscriber.error(error));
      }).catch(error => subscriber.error(error));
      return () => { stopped = true; unsubscribe?.(); };
    }).pipe(
      tap(profile => this.ownProfileState.next(profile)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    return this.ownProfileWatch$;
  }

  watchExcludedUserIds(): Observable<Set<string>> {
    return new Observable(subscriber => {
      const user = this.requireUser();
      let stopped = false;
      let unsubscribeBlocked: (() => void) | undefined;
      let unsubscribeBlockedBy: (() => void) | undefined;
      void this.loadFirestore().then(({ api, database }) => {
        if (stopped) return;
        let blocked = new Set<string>();
        let blockedBy = new Set<string>();
        const emit = (): void => subscriber.next(new Set([...blocked, ...blockedBy, user.uid]));
        unsubscribeBlocked = api.onSnapshot(api.collection(database, 'users', user.uid, 'blockedUsers'), snapshot => {
          blocked = new Set(snapshot.docs.map(item => item.id));
          emit();
        }, error => subscriber.error(error));
        unsubscribeBlockedBy = api.onSnapshot(api.collection(database, 'users', user.uid, 'blockedBy'), snapshot => {
          blockedBy = new Set(snapshot.docs.map(item => item.id));
          emit();
        }, error => subscriber.error(error));
      }).catch(error => subscriber.error(error));
      return () => { stopped = true; unsubscribeBlocked?.(); unsubscribeBlockedBy?.(); };
    });
  }

  async saveProfile(input: ProfileInput): Promise<void> {
    const user = this.requireUser();
    const { api, database } = await this.loadFirestore();
    const whatsapp = input.whatsapp ? this.contacts.normalizeWhatsapp(input.whatsapp) : null;
    const instagram = input.instagram ? this.contacts.normalizeInstagram(input.instagram) : null;
    if (input.whatsapp && !whatsapp) throw new Error('Ingresá un WhatsApp válido de Argentina con código de área.');
    if (input.instagram && !instagram) throw new Error('Ingresá un usuario de Instagram válido.');
    if (!whatsapp && !instagram) throw new Error('Elegí al menos un medio de contacto: WhatsApp o Instagram.');
    if (!input.privacyConsent) throw new Error('Debés aceptar las condiciones de privacidad.');
    const bio = input.preferences.bio.trim();
    if (bio.length < 50) throw new Error('Contanos un poco más sobre vos. La descripción debe tener al menos 50 caracteres.');
    if (bio.length > 500) throw new Error('La descripción puede tener como máximo 500 caracteres.');

    const publicRef = api.doc(database, 'users', user.uid);
    const privateRef = api.doc(database, 'userPrivate', user.uid);
    const [publicSnapshot, privateSnapshot] = await Promise.all([api.getDoc(publicRef), api.getDoc(privateRef)]);
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const displayName = `${firstName} ${lastName}`.trim();
    const batch = api.writeBatch(database);

    batch.set(publicRef, {
      uid: user.uid,
      displayName,
      firstName,
      lastName,
      role: input.role,
      province: 'Mendoza',
      city: input.city,
      avatarClass: input.avatarClass,
      active: true,
      profileCompleted: true,
      preferences: {
        systems: input.preferences.systems.map(value => value.trim()).filter(Boolean).slice(0, 12),
        experience: input.preferences.experience.trim(),
        mode: input.preferences.mode,
        frequency: input.preferences.frequency.trim(),
        availability: input.preferences.availability.trim(),
        atmosphere: input.preferences.atmosphere.trim(),
        bio
      },
      createdAt: publicSnapshot.exists() ? publicSnapshot.data()['createdAt'] || api.serverTimestamp() : api.serverTimestamp(),
      updatedAt: api.serverTimestamp()
    });

    batch.set(privateRef, {
      uid: user.uid,
      whatsappNumber: whatsapp?.value || '',
      whatsappUrl: whatsapp?.url || '',
      instagramUsername: instagram?.value || '',
      instagramUrl: instagram?.url || '',
      alternatePhone: this.contacts.normalizeAlternatePhone(input.alternatePhone),
      privacyConsent: true,
      privacyConsentAt: privateSnapshot.data()?.['privacyConsentAt'] || api.serverTimestamp(),
      createdAt: privateSnapshot.exists() ? privateSnapshot.data()['createdAt'] || api.serverTimestamp() : api.serverTimestamp(),
      updatedAt: api.serverTimestamp()
    });

    await batch.commit();
    this.publicProfileCache.delete(user.uid);
    this.privateProfileCache.delete(user.uid);
    await this.getOwnProfile();
    if (user.displayName !== displayName) {
      try {
        await this.auth.updateDisplayName(displayName);
      } catch (error) {
        // Firestore ya confirmó el perfil. La actualización cosmética de Auth
        // no debe impedir que el usuario finalice el onboarding.
        console.error('El perfil se guardó, pero no se pudo actualizar displayName en Auth.', error);
      }
    }
  }

  async blockUser(target: UserProfile): Promise<void> {
    const user = this.requireUser();
    if (target.uid === user.uid) throw new Error('No podés bloquear tu propia cuenta.');
    const { api, database } = await this.loadFirestore();
    const batch = api.writeBatch(database);
    batch.set(api.doc(database, 'users', user.uid, 'blockedUsers', target.uid), {
      uid: target.uid, displayName: target.displayName, createdAt: api.serverTimestamp()
    });
    batch.set(api.doc(database, 'users', target.uid, 'blockedBy', user.uid), {
      uid: user.uid, createdAt: api.serverTimestamp()
    });
    await batch.commit();
  }

  async unblockUser(targetUid: string): Promise<void> {
    const user = this.requireUser();
    const { api, database } = await this.loadFirestore();
    const batch = api.writeBatch(database);
    batch.delete(api.doc(database, 'users', user.uid, 'blockedUsers', targetUid));
    batch.delete(api.doc(database, 'users', targetUid, 'blockedBy', user.uid));
    await batch.commit();
  }

  async getBlockedUsers(): Promise<BlockedUser[]> {
    const user = this.requireUser();
    const { api, database } = await this.loadFirestore();
    const snapshot = await api.getDocs(api.collection(database, 'users', user.uid, 'blockedUsers'));
    return snapshot.docs.map(item => ({
      uid: item.id,
      displayName: String(item.data()['displayName'] || 'Usuario'),
      createdAt: item.data()['createdAt']
    }));
  }

  async deleteOwnContactData(): Promise<void> {
    const user = this.requireUser();
    const { api, database } = await this.loadFirestore();
    const batch = api.writeBatch(database);
    batch.delete(api.doc(database, 'userPrivate', user.uid));
    batch.set(api.doc(database, 'users', user.uid), {
      profileCompleted: false,
      updatedAt: api.serverTimestamp()
    }, { merge: true });
    await batch.commit();
    this.publicProfileCache.delete(user.uid);
    this.privateProfileCache.delete(user.uid);
    this.ownProfileState.next(null);
  }

  isComplete(profile: UserProfile | null): boolean {
    return Boolean(
      profile?.profileCompleted
      && profile.firstName
      && profile.lastName
      && profile.city.trim().length >= 2
      && (profile.role === 'DM' || profile.role === 'PLAYER' || profile.role === 'BOTH')
      && profile.preferences.systems.length
      && profile.preferences.experience
      && profile.preferences.frequency
      && profile.preferences.availability
      && profile.preferences.atmosphere
      && profile.preferences.bio.trim().length >= 50
      && profile.preferences.bio.length <= 500
    );
  }

  private mapPublic(data: DocumentData): UserProfile {
    const preferences = data['preferences'] || {};
    const hasValidRole = data['role'] === 'DM' || data['role'] === 'PLAYER' || data['role'] === 'BOTH';
    return {
      uid: String(data['uid'] || ''),
      displayName: String(data['displayName'] || 'Aventurero/a'),
      firstName: String(data['firstName'] || ''),
      lastName: String(data['lastName'] || ''),
      role: data['role'] === 'DM' || data['role'] === 'BOTH' ? data['role'] : 'PLAYER',
      province: 'Mendoza',
      city: String(data['city'] || ''),
      avatarClass: migrateLegacyAvatar(data['avatarClass'] || data['avatarType'], String(data['uid'] || '')),
      active: data['active'] !== false,
      profileCompleted: data['profileCompleted'] === true && hasValidRole,
      preferences: {
        systems: Array.isArray(preferences['systems']) ? preferences['systems'].map((value: unknown) => String(value)) : [],
        experience: String(preferences['experience'] || 'Sin especificar'),
        mode: preferences['mode'] === 'Online' || preferences['mode'] === 'Mixto' ? preferences['mode'] : 'Presencial',
        frequency: String(preferences['frequency'] || 'A coordinar'),
        availability: String(preferences['availability'] || 'A coordinar'),
        atmosphere: String(preferences['atmosphere'] || 'Me adapto al grupo'),
        bio: String(preferences['bio'] || 'Con ganas de compartir historias y conocer una mesa.')
      },
      createdAt: data['createdAt'],
      updatedAt: data['updatedAt']
    };
  }

  private mapPrivate(data: DocumentData): UserPrivateProfile {
    return {
      uid: String(data['uid'] || ''),
      whatsappNumber: String(data['whatsappNumber'] || ''),
      whatsappUrl: String(data['whatsappUrl'] || ''),
      instagramUsername: String(data['instagramUsername'] || ''),
      instagramUrl: String(data['instagramUrl'] || ''),
      alternatePhone: String(data['alternatePhone'] || ''),
      privacyConsent: data['privacyConsent'] === true,
      privacyConsentAt: data['privacyConsentAt'],
      createdAt: data['createdAt'],
      updatedAt: data['updatedAt']
    };
  }

  private requireUser() {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Necesitás iniciar sesión para continuar.');
    return user;
  }

  private async loadFirestore() {
    if (!this.firebase.app) throw new Error('Firestore no está disponible en este momento.');
    const api = await import('firebase/firestore');
    return { api, database: api.getFirestore(this.firebase.app) };
  }
}
