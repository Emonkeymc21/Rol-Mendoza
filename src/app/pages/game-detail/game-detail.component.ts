import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicComment } from '../../core/models/community-api.model';
import { Game } from '../../core/models/game.model';
import { CommunityService } from '../../core/services/community.service';
import { AuthService } from '../../core/services/auth.service';
import { GameJoinRequest } from '../../core/models/join-request.model';
import { NotificationService } from '../../core/services/notification.service';
import { ProfileService } from '../../core/services/profile.service';
import { GameParticipantView } from '../../core/models/game-participant.model';
import { GameParticipantService } from '../../core/services/game-participant.service';
import { UserProfile } from '../../core/models/user-profile.model';

@Component({ selector: 'app-game-detail', templateUrl: './game-detail.component.html', styleUrls: ['./game-detail.component.scss'] })
export class GameDetailComponent {
  game?: Game;
  comments: PublicComment[] = [];
  notice = '';
  joinNotice = '';
  commentNotice = '';
  joinError = '';
  commentError = '';
  joinOpen = false;
  sendingJoin = false;
  sendingComment = false;
  joinRequest?: GameJoinRequest;
  canRequestJoin = false;
  joinRoleLoaded = false;
  participants: GameParticipantView[] = [];
  dmProfile?: UserProfile;
  readonly apiConnected: boolean;
  private readonly gameId: string;

  readonly user$ = this.auth.user$;

  joinForm = this.fb.nonNullable.group({ message: ['', Validators.maxLength(500)] });

  commentForm = this.fb.nonNullable.group({ comment: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(700)]] });

  constructor(
    route: ActivatedRoute,
    private fb: FormBuilder,
    private community: CommunityService,
    private auth: AuthService,
    notifications: NotificationService,
    private profiles: ProfileService,
    participants: GameParticipantService,
    private router: Router
  ) {
    this.gameId = route.snapshot.paramMap.get('id') ?? '';
    this.apiConnected = community.isConnected();
    this.loadGame();
    participants.watchGame(this.gameId).subscribe({
      next: items => this.participants = items,
      error: error => console.error('No se pudieron cargar los jugadores confirmados.', error)
    });
    if (this.auth.currentUser) {
      void profiles.getOwnProfile().then(profile => {
        this.canRequestJoin = profile?.role === 'PLAYER' || profile?.role === 'BOTH';
        this.joinRoleLoaded = true;
      }).catch(() => this.joinRoleLoaded = true);
      notifications.watchMyRequests().subscribe({
        next: requests => {
          const previous = this.joinRequest?.status;
          this.joinRequest = requests.find(item => item.gameId === this.gameId);
          if (this.joinRequest?.status === 'APPROVED' && previous !== 'APPROVED') this.loadGame();
        },
        error: error => console.error('No se pudo consultar el estado de la solicitud.', error)
      });
    }
    if (this.apiConnected) this.loadComments();
  }

  join(): void {
    this.notice = '';
    if (this.game?.status === 'FULL') {
      this.notice = 'Esta partida está completa y no recibe nuevas solicitudes.';
      return;
    }
    if (this.isOwnGame()) {
      this.notice = 'Esta partida fue creada por vos. Podés administrarla desde Mis partidas.';
      return;
    }
    if (this.joinRoleLoaded && !this.canRequestJoin) {
      this.notice = 'Para solicitar unirte, tu perfil debe tener rol Jugador o Ambos.';
      return;
    }
    if (this.joinRequest) {
      this.joinNotice = this.requestMessage();
      this.joinOpen = false;
      return;
    }
    if (!this.auth.currentUser) {
      void this.router.navigate(['/ingresar'], { queryParams: { returnUrl: `/partidas/${this.gameId}` } });
      return;
    }
    if (!this.apiConnected) {
      this.notice = 'El servicio no está disponible en este momento. Intentá nuevamente más tarde.';
      return;
    }
    this.joinOpen = !this.joinOpen;
  }

  submitJoin(): void {
    if (this.sendingJoin) return;
    if (this.joinForm.invalid) { this.joinForm.markAllAsTouched(); return; }
    const { message } = this.joinForm.getRawValue();
    this.sendingJoin = true;
    this.joinError = '';
    this.community.requestJoin(this.gameId, message).subscribe({
      next: result => {
        this.sendingJoin = false;
        this.joinNotice = result.message;
        this.joinOpen = false;
        this.joinForm.reset({ message: '' });
      },
      error: error => {
        this.sendingJoin = false;
        this.joinError = error?.message || 'No pudimos enviar la solicitud.';
      }
    });
  }

  isOwnGame(): boolean {
    return Boolean(this.game?.masterUserId && this.game.masterUserId === this.auth.currentUser?.uid);
  }

  joinButtonText(): string {
    if (this.game?.status === 'FULL') return 'Partida completa';
    if (this.isOwnGame()) return 'Administrar mi partida';
    if (this.joinRoleLoaded && !this.canRequestJoin) return 'Disponible para jugadores';
    if (this.joinRequest?.status === 'APPROVED') return 'Ya formás parte';
    if (this.joinRequest?.status === 'REJECTED') return 'Solicitud no aceptada';
    if (this.joinRequest?.seenByDm) return 'Solicitud vista';
    if (this.joinRequest) return 'Solicitud pendiente';
    return 'Solicitar unirme';
  }

  requestMessage(): string {
    if (!this.joinRequest) return '';
    if (this.joinRequest.status === 'APPROVED') return '¡Te aceptaron en esta partida!';
    if (this.joinRequest.status === 'REJECTED') return 'El DM decidió no aceptar esta solicitud.';
    return this.joinRequest.seenByDm
      ? 'El DM ya vio tu solicitud. Sigue pendiente de respuesta.'
      : 'El DM recibió tu solicitud.';
  }

  occupiedPlayers(): number {
    if (!this.game) return 0;
    return Math.min(this.game.totalSeats, Math.max(0, this.game.currentPlayers));
  }

  availableMessage(): string {
    if (!this.game || this.game.status === 'FULL' || this.game.seats <= 0) return 'Mesa completa';
    return `${this.game.seats} ${this.game.seats === 1 ? 'lugar disponible' : 'lugares disponibles'}`;
  }

  submitComment(): void {
    if (this.commentForm.invalid) { this.commentForm.markAllAsTouched(); return; }
    if (!this.auth.currentUser) {
      void this.router.navigate(['/ingresar'], { queryParams: { returnUrl: `/partidas/${this.gameId}` } });
      return;
    }
    const { comment } = this.commentForm.getRawValue();
    this.sendingComment = true;
    this.commentError = '';
    this.community.addComment(this.gameId, comment).subscribe({
      next: result => {
        this.sendingComment = false;
        this.commentNotice = result.message;
        this.commentForm.reset({ comment: '' });
        this.loadComments();
      },
      error: error => {
        this.sendingComment = false;
        this.commentError = error?.message || 'No pudimos enviar el comentario.';
      }
    });
  }

  private loadComments(): void {
    this.community.getComments(this.gameId).subscribe({
      next: comments => this.comments = comments,
      error: () => this.comments = []
    });
  }

  private loadGame(): void {
    this.community.getGame(this.gameId).subscribe(game => {
      this.game = game;
      if (game?.masterUserId) {
        void this.profiles.getProfile(game.masterUserId).then(profile => this.dmProfile = profile || undefined).catch(() => this.dmProfile = undefined);
      }
    });
  }
}
