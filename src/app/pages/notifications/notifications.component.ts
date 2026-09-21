import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification } from '../../core/models/join-request.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({ selector: 'app-notifications', templateUrl: './notifications.component.html', styleUrls: ['./notifications.component.scss'] })
export class NotificationsComponent {
  notifications: AppNotification[] = [];
  loading = true;
  markingAll = false;
  errorMessage = '';

  constructor(private notificationService: NotificationService, private router: Router) {
    notificationService.notifications$.subscribe({
      next: notifications => { this.notifications = notifications; this.loading = false; },
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
    const target = item.type === 'JOIN_REQUEST' ? '/solicitudes' : '/mis-solicitudes';
    await this.router.navigate([target], { queryParams: item.type === 'JOIN_REQUEST' ? { request: item.requestId } : {} });
  }

  async markAll(): Promise<void> {
    if (!this.unreadCount || this.markingAll) return;
    this.markingAll = true;
    try { await this.notificationService.markAllRead(this.notifications); }
    catch (error) { this.errorMessage = 'No pudimos marcar las notificaciones como leídas.'; }
    finally { this.markingAll = false; }
  }
}
