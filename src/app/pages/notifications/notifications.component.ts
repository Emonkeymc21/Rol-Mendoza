import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../core/models/join-request.model';
import { NotificationService } from '../../core/services/notification.service';
import { UserProfile } from '../../core/models/user-profile.model';
import { ProfileService } from '../../core/services/profile.service';

@Component({ selector: 'app-notifications', templateUrl: './notifications.component.html', styleUrls: ['./notifications.component.scss'] })
export class NotificationsComponent {
  notifications: AppNotification[] = [];
  loading = true;
  markingAll = false;
  errorMessage = '';
  actorProfiles: Record<string, UserProfile | null> = {};

  constructor(private notificationService: NotificationService, private router: Router, private profiles: ProfileService) {
    notificationService.notifications$.subscribe({
      next: notifications => {
        this.notifications = notifications;
        this.loading = false;
        void this.loadActorProfiles(notifications);
      },
      error: error => {
        console.error('No se pudieron cargar las notificaciones.', error);
        this.errorMessage = 'No pudimos cargar tus notificaciones.';
        this.loading = false;
      }
    });
  }

  get unreadCount(): number { return this.notifications.filter(item => !item.read).length; }

   async open(item: AppNotification): Promise<void> {
    try { await this.notificationService.markRead(item); }
    catch (error) { console.error('No se pudo marcar la notificación como leída.', error); }
    if (item.type === 'JOIN_REQUEST') {
      await this.router.navigate(['/solicitudes'], { queryParams: { request: item.requestId } });
      return;
    }
    if (item.type === 'GAME_CANCELLED' && item.gameId) {
      await this.router.navigate(['/partidas', item.gameId]);
      return;
    }
    await this.router.navigate(['/mis-solicitudes']);
  }

  async markAll(): Promise<void> {
    if (!this.unreadCount || this.markingAll) return;
    this.markingAll = true;
    try { await this.notificationService.markAllRead(this.notifications); }
    catch (error) { this.errorMessage = 'No pudimos marcar las notificaciones como leídas.'; }
    finally { this.markingAll = false; }
  }

  private async loadActorProfiles(notifications: AppNotification[]): Promise<void> {
    const missing = [...new Set(notifications.map(item => item.actorUid).filter(uid => uid && !(uid in this.actorProfiles)))];
    await Promise.all(missing.map(async uid => {
      try { this.actorProfiles[uid] = await this.profiles.getProfile(uid); }
      catch { this.actorProfiles[uid] = null; }
    }));
  }
}
