import { Component } from '@angular/core';
import { GameJoinRequest, requestStatusLabel } from '../../core/models/join-request.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({ selector: 'app-my-requests', templateUrl: './my-requests.component.html', styleUrls: ['./my-requests.component.scss'] })
export class MyRequestsComponent {
  requests: GameJoinRequest[] = [];
  loading = true;
  errorMessage = '';

  constructor(notifications: NotificationService) {
    notifications.watchMyRequests().subscribe({
      next: requests => { this.requests = requests; this.loading = false; },
      error: error => {
        console.error('No se pudieron cargar las solicitudes del jugador.', error);
        this.errorMessage = 'No pudimos cargar tus solicitudes. Intentá nuevamente.';
        this.loading = false;
      }
    });
  }

  statusLabel(request: GameJoinRequest): string { return requestStatusLabel(request); }
}
