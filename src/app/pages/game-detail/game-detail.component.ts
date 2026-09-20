import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PublicComment } from '../../core/models/community-api.model';
import { Game } from '../../core/models/game.model';
import { CommunityService } from '../../core/services/community.service';
import { AuthService } from '../../core/services/auth.service';

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
    private router: Router
  ) {
    this.gameId = route.snapshot.paramMap.get('id') ?? '';
    this.apiConnected = community.isConnected();
    community.getGame(this.gameId).subscribe(game => this.game = game);
    if (this.apiConnected) this.loadComments();
  }

  join(): void {
    this.notice = '';
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
    if (this.joinForm.invalid) { this.joinForm.markAllAsTouched(); return; }
    const { message } = this.joinForm.getRawValue();
    this.sendingJoin = true;
    this.joinError = '';
    this.community.requestJoin(this.gameId, message).subscribe({
      next: result => {
        this.sendingJoin = false;
        this.joinNotice = result.message;
        this.joinForm.reset({ message: '' });
      },
      error: error => {
        this.sendingJoin = false;
        this.joinError = error?.message || 'No pudimos enviar la solicitud.';
      }
    });
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
}
