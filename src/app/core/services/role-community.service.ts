import { Injectable, PendingTasks, inject } from '@angular/core';
import type { DocumentData } from 'firebase/firestore';
import { defer, map, Observable, shareReplay } from 'rxjs';
import { CommunityActivity, CommunityAdminRequestInput, RoleCommunity } from '../models/role-community.model';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class RoleCommunityService {
  private readonly pending = inject(PendingTasks);
  private published$?: Observable<RoleCommunity[]>;

  constructor(private firebase: FirebaseService, private auth: AuthService) {}

  getPublished(): Observable<RoleCommunity[]> {
    if (!this.published$) {
      this.published$ = defer(async () => {
        const done = this.pending.add();
        try {
        const { api, database } = await this.loadFirestore();
        const query = api.query(
          api.collection(database, 'roleCommunities'),
          api.where('status', '==', 'PUBLISHED'),
          api.where('active', '==', true)
        );
        const snapshot = await api.getDocs(query);
        return snapshot.docs
          .map(item => this.mapCommunity(item.id, item.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'es'));
        } finally { done(); }
      }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }
    return this.published$;
  }

  async requestAdministration(input: CommunityAdminRequestInput): Promise<void> {
    const user = await this.auth.waitUntilReady();
    if (!user) throw new Error('Necesitás iniciar sesión para enviar la solicitud.');
    const clean = {
      name: input.name.trim(),
      description: input.description.trim(),
      zone: input.zone.trim(),
      instagramUrl: this.safeUrl(input.instagramUrl),
      discordUrl: this.safeUrl(input.discordUrl),
      websiteUrl: this.safeUrl(input.websiteUrl)
    };
    if (clean.name.length < 3 || clean.name.length > 100) throw new Error('Revisá el nombre de la comunidad.');
    if (clean.description.length < 50 || clean.description.length > 800) throw new Error('La descripción debe tener entre 50 y 800 caracteres.');
    if (!clean.zone || clean.zone.length > 100) throw new Error('Indicá la zona donde se reúne la comunidad.');
    if (!clean.instagramUrl && !clean.discordUrl && !clean.websiteUrl) throw new Error('Agregá al menos un canal oficial de la comunidad.');

    const { api, database } = await this.loadFirestore();
    const pendingQuery = api.query(
      api.collection(database, 'communityAdminRequests'),
      api.where('requesterUid', '==', user.uid),
      api.where('status', '==', 'PENDING')
    );
    const pending = await api.getDocs(pendingQuery);
    if (!pending.empty) throw new Error('Ya tenés una solicitud de comunidad pendiente de revisión.');

    await api.addDoc(api.collection(database, 'communityAdminRequests'), {
      requesterUid: user.uid,
      name: clean.name,
      description: clean.description,
      zone: clean.zone,
      instagramUrl: clean.instagramUrl,
      discordUrl: clean.discordUrl,
      websiteUrl: clean.websiteUrl,
      status: 'PENDING',
      createdAt: api.serverTimestamp(),
      updatedAt: api.serverTimestamp()
    });
  }

  private mapCommunity(id: string, data: DocumentData): RoleCommunity {
    const activities = Array.isArray(data['activities'])
      ? data['activities'].map((item: unknown) => this.mapActivity(item)).filter((item: CommunityActivity | null): item is CommunityActivity => Boolean(item))
      : [];
    return {
      id,
      name: String(data['name'] || 'Comunidad de rol'),
      description: String(data['description'] || ''),
      zone: String(data['zone'] || 'Mendoza'),
      instagramUrl: this.safeUrl(String(data['instagramUrl'] || '')),
      discordUrl: this.safeUrl(String(data['discordUrl'] || '')),
      websiteUrl: this.safeUrl(String(data['websiteUrl'] || '')),
      activities: activities.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0)),
      updatedAt: this.toDate(data['updatedAt'])
    };
  }

  private mapActivity(value: unknown): CommunityActivity | null {
    if (!value || typeof value !== 'object') return null;
    const item = value as Record<string, unknown>;
    const title = String(item['title'] || '').trim();
    if (!title) return null;
    const modeValue = String(item['mode'] || 'Presencial');
    const mode: CommunityActivity['mode'] = modeValue === 'Online' || modeValue === 'Mixto' ? modeValue : 'Presencial';
    return {
      title,
      date: this.toDate(item['date']),
      location: String(item['location'] || ''),
      mode,
      url: this.safeUrl(String(item['url'] || ''))
    };
  }

  private safeUrl(value: string): string {
    const normalized = value.trim();
    if (!normalized) return '';
    try {
      const url = new URL(normalized);
      return url.protocol === 'https:' ? url.toString() : '';
    } catch {
      return '';
    }
  }

  private toDate(value: unknown): Date | undefined {
    if (value && typeof value === 'object' && 'toDate' in value) {
      const timestamp = value as { toDate?: () => Date };
      if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    }
    return value instanceof Date ? value : undefined;
  }

  private loadFirestore() {
    return this.firebase.loadFirestore();
  }
}
